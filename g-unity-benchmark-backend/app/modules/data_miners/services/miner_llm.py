from __future__ import annotations

import asyncio
import copy
import json
import hashlib
from typing import Any, ClassVar, List

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.modules.data_miners.prompts import COMPETITIVE_INTELLIGENCE_SYSTEM_PROMPT
from app.modules.data_miners.schemas import MiningResponse


class MinerLLMService:
    _response_cache: ClassVar[dict[str, list[dict[str, Any]]]] = {}
    _cache_lock: ClassVar[asyncio.Lock] = asyncio.Lock()

    def __init__(self, api_key: str, model: str = "gemma-4-26b-a4b-it") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def _resolve_json_schema(self, model: type[MiningResponse]) -> dict[str, Any]:
        raw_schema = model.model_json_schema(ref_template="#/$defs/{model}")
        definitions = raw_schema.pop("$defs", {})

        def _resolve(node: Any) -> Any:
            if isinstance(node, dict):
                if "$ref" in node:
                    ref_name = str(node["$ref"]).split("/")[-1]
                    resolved = copy.deepcopy(definitions.get(ref_name, {}))
                    if not resolved:
                        return {}
                    merged = {key: value for key, value in node.items() if key != "$ref"}
                    resolved.update(merged)
                    return _resolve(resolved)

                resolved_dict: dict[str, Any] = {}
                for key, value in node.items():
                    if key in {"title", "description", "examples"}:
                        continue
                    if key == "additionalProperties":
                        continue
                    resolved_dict[key] = _resolve(value)
                return resolved_dict
            if isinstance(node, list):
                return [_resolve(item) for item in node]
            return node

        return _resolve(raw_schema)

    def _compute_prompt_hash(self, engine: str, context: str, schema: dict[str, Any]) -> str:
        payload = {
            "engine": engine.strip().lower(),
            "context": context.strip(),
            "model": self._model,
            "system_prompt": COMPETITIVE_INTELLIGENCE_SYSTEM_PROMPT.strip(),
            "schema": schema,
        }
        serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
        return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    async def _get_cached_response(self, cache_key: str) -> list[dict[str, Any]] | None:
        async with self._cache_lock:
            cached = self._response_cache.get(cache_key)
            if cached is None:
                return None
            return copy.deepcopy(cached)

    async def _set_cached_response(self, cache_key: str, response: list[dict[str, Any]]) -> None:
        async with self._cache_lock:
            self._response_cache[cache_key] = copy.deepcopy(response)

    def _build_prompt(self, engine: str, context: str) -> str:
        return (
            f"TARGET_ENGINE: {engine}\n"
            f"TASK: Analyze the following source evidence and return strict flat JSON objects.\n\n"
            f"CONTEXT:\n{context}\n\n"
            "Return only valid JSON matching the schema."
        )

    def _parse_response(self, response: Any) -> MiningResponse:
        try:
            parsed = response.parsed
            if isinstance(parsed, MiningResponse):
                return parsed
            if parsed is not None:
                return MiningResponse.model_validate(parsed)
        except ValidationError:
            pass
        except Exception:
            pass

        raw = getattr(response, "text", None)
        if not isinstance(raw, str) or not raw.strip():
            raise ValueError("Gemini returned an invalid or empty response")

        payload = json.loads(raw)
        return MiningResponse.model_validate(payload)

    async def analyze(self, engine: str, context: str) -> List[dict]:
        schema = self._resolve_json_schema(MiningResponse)
        cache_key = self._compute_prompt_hash(engine, context, schema)

        cached_response = await self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        prompt = self._build_prompt(engine, context)
        config = types.GenerateContentConfig(
            system_instruction=COMPETITIVE_INTELLIGENCE_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=schema,
            temperature=0.2,
        )
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )

        result = self._parse_response(response)
        normalized = [post.model_dump(mode="json") for post in result.posts]
        await self._set_cached_response(cache_key, normalized)
        return normalized
