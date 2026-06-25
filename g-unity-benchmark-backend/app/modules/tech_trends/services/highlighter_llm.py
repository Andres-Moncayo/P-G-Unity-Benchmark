from __future__ import annotations

import asyncio
import copy
import hashlib
import json
from typing import Any, ClassVar, List

from google import genai
from google.genai import types
from pydantic import ValidationError

from app.modules.tech_trends.prompts import TECH_TRENDS_EXECUTIVE_SYSTEM_PROMPT
from app.modules.tech_trends.schemas import ExecutiveHighlightPayload, Highlight, PostHighlight


class TechTrendsHighlighterLLMService:
    _response_cache: ClassVar[dict[str, dict[str, Any]]] = {}
    _cache_lock: ClassVar[asyncio.Lock] = asyncio.Lock()

    def __init__(self, api_key: str, model: str = "gemini-3-flash-preview") -> None:
        self._client = genai.Client(api_key=api_key)
        self._model = model

    def _resolve_json_schema(self, model: type[ExecutiveHighlightPayload]) -> dict[str, Any]:
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

    # def _compute_prompt_hash(self, posts: list[PostHighlight], schema: dict[str, Any]) -> str:
    #     payload = {
    #         "posts": [post.model_dump(mode="json") for post in posts],
    #         "model": self._model,
    #         "system_prompt": TECH_TRENDS_EXECUTIVE_SYSTEM_PROMPT.strip(),
    #         "schema": schema,
    #     }
    #     serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
    #     return hashlib.sha256(serialized.encode("utf-8")).hexdigest()

    def _compute_prompt_hash(self, posts: list[PostHighlight]) -> str:
            payload = {
                "posts": [post.model_dump(mode="json") for post in posts],
                "model": self._model,
                "system_prompt": TECH_TRENDS_EXECUTIVE_SYSTEM_PROMPT.strip(),
                "schema": ExecutiveHighlightPayload.model_json_schema()
            }
            serialized = json.dumps(payload, sort_keys=True, ensure_ascii=False, separators=(",", ":"))
            return hashlib.sha256(serialized.encode("utf-8")).hexdigest()


    async def _get_cached_response(self, cache_key: str) -> dict[str, Any] | None:
        async with self._cache_lock:
            cached = self._response_cache.get(cache_key)
            if cached is None:
                return None
            return copy.deepcopy(cached)

    async def _set_cached_response(self, cache_key: str, response: dict[str, Any]) -> None:
        async with self._cache_lock:
            self._response_cache[cache_key] = copy.deepcopy(response)

    def _build_context(self, posts: list[PostHighlight]) -> str:
        lines: list[str] = []
        for index, post in enumerate(posts, start=1):
            lines.append(
                f"{index}. TITLE: {post.title or ''}\n"
                f"SUMMARY: {post.summary or ''}\n"
                f"URL: {post.url or ''}\n"
                f"DATE: {post.date.isoformat() if post.date else ''}\n"
                f"GAME_ENGINE: {post.game_engine or ''}\n"
                f"CATEGORY: {post.category.value if post.category else ''}"
            )
        return "\n\n".join(lines)

    def _parse_response(self, response: Any) -> ExecutiveHighlightPayload:
        try:
            parsed = response.parsed
            if isinstance(parsed, ExecutiveHighlightPayload):
                return parsed
            if parsed is not None:
                return ExecutiveHighlightPayload.model_validate(parsed)
        except ValidationError:
            pass
        except Exception:
            pass

        raw = getattr(response, "text", None)
        if not isinstance(raw, str) or not raw.strip():
            raise ValueError("Gemini returned an invalid or empty response")

        payload = json.loads(raw)
        return ExecutiveHighlightPayload.model_validate(payload)

    async def create_executive_highlight(self, posts: list[PostHighlight]) -> dict[str, Any]:
        if not posts:
            raise ValueError("posts cannot be empty")
        
        # ─── 🛠️ AQUÍ ESTÁ LA MAGIA DE LA REPARACIÓN ───
        # Si los posts vienen como modelos de SQLAlchemy, los transformamos a Pydantic Schemas automáticamente
        from app.modules.tech_trends.schemas import PostHighlight as PostHighlightSchema
        
        pydantic_posts = [
            PostHighlightSchema.model_validate(post) if not isinstance(post, PostHighlightSchema) else post
            for post in posts
        ]
        # ──────────────────────────────────────────────


        # schema = self._resolve_json_schema(ExecutiveHighlightPayload)
        # cache_key = self._compute_prompt_hash(posts, schema)
        # Ahora usamos 'pydantic_posts' en lugar de 'posts' en todo el proceso
        cache_key = self._compute_prompt_hash(pydantic_posts)

        cached_response = await self._get_cached_response(cache_key)
        if cached_response is not None:
            return cached_response

        context = self._build_context(posts)
        prompt = (
            "TASK: Synthesize the grouped trend evidence into one executive highlight.\n\n"
            f"CONTEXT:\n{context}\n\n"
            "Return only valid JSON matching the schema."
        )
        config = types.GenerateContentConfig(
            system_instruction=TECH_TRENDS_EXECUTIVE_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ExecutiveHighlightPayload,
            temperature=0.2,
        )
        response = await self._client.aio.models.generate_content(
            model=self._model,
            contents=prompt,
            config=config,
        )

        result = self._parse_response(response)
        normalized = result.model_dump(mode="json")
        await self._set_cached_response(cache_key, normalized)
        return normalized
