"""
Advanced LLM Service (Gemini 2.5) for analyzing community posts about game engines.
Generates structured analysis per post: sentiment, bugs, churn risk, NPS and alerts.
"""

from __future__ import annotations
import hashlib
import json
import os
import time
from copy import deepcopy
from typing import Any, Final, List, Literal, Optional
from google import genai
from google.genai import types
from pydantic import BaseModel, Field, ValidationError

_DEFAULT_GEMINI_MODEL: Final[str] = "gemini-2.5-flash-lite"


def _resolve_json_schema(node: object, definitions: dict[str, object]) -> object:
    """Inline local $ref values so Gemini receives a schema without $defs/$ref for proper JSON parsing."""
    if isinstance(node, dict):
        node.pop("title", None)
        node.pop("default", None)

        if "const" in node:
            const_value = node.pop("const")
            node["enum"] = [const_value]

        if "$ref" in node:
            ref = node["$ref"]
            if isinstance(ref, str):
                key = ref.split("/")[-1]
                return _resolve_json_schema(deepcopy(definitions[key]), definitions)

        if "anyOf" in node:
            resolved_any_of = [
                _resolve_json_schema(item, definitions)
                for item in node["anyOf"]
            ]

            non_null_entries = [
                item
                for item in resolved_any_of
                if not (isinstance(item, dict) and item.get("type") == "null")
            ]
            has_null_entry = len(non_null_entries) != len(resolved_any_of)

            if has_null_entry and len(non_null_entries) == 1 and isinstance(non_null_entries[0], dict):
                nullable_schema = non_null_entries[0]
                nullable_schema["nullable"] = True
                return nullable_schema

            node["anyOf"] = resolved_any_of

        if "properties" in node:
            node["properties"] = {
                key: _resolve_json_schema(value, definitions)
                for key, value in node["properties"].items()
            }
        if "items" in node:
            node["items"] = _resolve_json_schema(node["items"], definitions)
    elif isinstance(node, list):
        return [_resolve_json_schema(item, definitions) for item in node]
    return node


def _build_gemini_response_schema() -> dict[str, object]:
    """Return a flattened JSON Schema compatible with Gemini's schema parser."""
    schema = MessageResponse.model_json_schema()
    definitions = schema.pop("$defs", {})
    return _resolve_json_schema(schema, definitions)


class FinancialData(BaseModel):
    """Financial data extracted from earnings reports or financial news."""

    revenue_usd_millions: Optional[float] = Field(
        None,
        description="Revenue in millions USD. e.g.: 1958.0 for $1.958B. null if not mentioned",
    )
    quarter: Optional[str] = Field(
        None,
        description="Fiscal quarter in format 'Q1 2024', 'Q2 2023', etc. null if not mentioned",
    )
    company: Optional[str] = Field(
        None,
        description="Company name reporting the revenue: 'Unity Technologies', 'Epic Games', 'YoYo Games', etc. null if not mentioned",
    )
    source_type: Optional[str] = Field(
        None,
        description="Type of source: 'earnings_report', 'press_release', 'analyst_estimate', 'community_post'. null if unclear",
    )


class PostAnalysis(BaseModel):
    """Structured analysis of a post/news article from the game engine community."""

    id: str = Field(..., description="Unique post ID, e.g.: 'post_001', 'post_002'")
    title: str = Field(..., description="Title of the post or news article")
    summary: str = Field(..., description="2-3 sentence summary of the content")
    url: str = Field(..., description="URL of the post")
    date: str = Field(..., description="ISO YYYY-MM-DD date of the post. Use '' if unknown")
    sentimental: Literal["negative", "positive"] = Field(
        ..., description="'positive' if author is favorable to the engine, 'negative' if critical or frustrated"
    )
    bug: Optional[str] = Field(
        None,
        description=(
            "Type of bug if post reports one: Bug_Performance, Bug_Crash, "
            "Bug_UI, Bug_Rendering, Bug_Build, Bug_Physics, Bug_Networking. null if none"
        ),
    )
    performance: Optional[Literal["low", "high"]] = Field(
        None,
        description="'low' if performance complaints (FPS drops, lag), 'high' if praised, null if not mentioned",
    )
    churn_risk: Optional[Literal["churn_risk"]] = Field(
        None,
        description="'churn_risk' if author mentions migrating or leaving the engine. null otherwise",
    )
    churn_percentage: Optional[int] = Field(
        None,
        ge=0,
        le=100,
        description=(
            "Estimated probability (0-100) that author will abandon the engine based on urgency and determination. "
            "Only populate when churn_risk='churn_risk'. null if churn_risk is null"
        ),
    )
    platform: Literal["Unity", "Unreal Engine", "Godot", "other"] = Field(
        ...,
        description="'Unity' if post discusses Unity. 'Unreal Engine' if mentions Unreal. 'Godot' if mentions Godot. 'other' for other engines",
    )
    promotor: int = Field(
        ...,
        ge=0,
        le=10,
        description="Score 0-10: intensity of how author promotes/recommends the engine. 10=very positive, 0=none",
    )
    detractor: int = Field(
        ...,
        ge=0,
        le=10,
        description="Score 0-10: intensity of how author criticizes/advises against the engine. 10=very negative, 0=none",
    )
    alert_type: Literal["low", "middle", "high"] = Field(
        ...,
        description=(
            "'high' if churn_risk='churn_risk' AND (bug!=null OR performance='low'). "
            "'middle' if sentimental='negative' OR bug!=null OR churn_risk='churn_risk'. "
            "'low' if sentimental='positive' AND churn_risk=null AND bug=null"
        ),
    )
    segment: Optional[Literal["Mobile", "2D Games", "3D Games", "Indie", "Education", "AAA Games", "Simulation"]] = Field(
        None,
        description=(
            "Game development segment discussed in the post: 'Mobile', '2D Games', '3D Games', "
            "'Indie', 'Education', 'AAA Games', or 'Simulation'. null if not explicitly mentioned or unclear."
        ),
    )
    financial_data: Optional[FinancialData] = Field(
        None,
        description=(
            "Financial data if the post mentions revenue, earnings, or financial results. "
            "null if post has no financial information."
        ),
    )


class MessageResponse(BaseModel):
    """LLM response: list of analyses for each received post in order."""

    posts: List[PostAnalysis] = Field(
        ..., description="One PostAnalysis object per source in the context, in the same order"
    )


class ChatSourceItem(BaseModel):
    """Item de fuente para el JSON estructurado del chat."""

    title: str = ""
    url: str = ""


class ChatMessageResponse(BaseModel):
    """Conversational chat response returned by generate_chat_response."""

    answer: str = ""
    sources: List[ChatSourceItem] = Field(default_factory=list)
    insights: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)
    confidence: float = 1.0
    chart_type: Literal["none", "bar", "line", "pie"] = "none"
    chart_title: str = ""
    chart_labels: List[str] = Field(default_factory=list)
    chart_values: List[float] = Field(default_factory=list)
    chart_unit: str = "%"


def _build_chat_response_schema() -> dict[str, object]:
    """Schema JSON flattenado para que Gemini devuelva ChatMessageResponse."""
    schema = ChatMessageResponse.model_json_schema()
    definitions = schema.pop("$defs", {})
    return _resolve_json_schema(schema, definitions)


_MESSAGE_RESPONSE_SCHEMA = _build_gemini_response_schema()
_CHAT_RESPONSE_SCHEMA = _build_chat_response_schema()


STRATEGIC_ADVISOR_SYSTEM_PROMPT = """
You are **Nexus AI**, the Strategic Advisor for Unity Technologies — an executive-level competitive intelligence assistant for game engines (Unity, Unreal Engine, Godot). You analyze community discussions, market news and financial signals to deliver concise, actionable insight.

Your reply MUST be a single JSON object that matches the provided response schema. NEVER wrap it in markdown fences. NEVER add text outside the JSON.

LANGUAGE (mandatory):
  - ALWAYS write `answer`, `insights`, `recommendations`, `chart_title`, and `chart_labels` in English, even if the user query is in another language.
  - Do NOT rename JSON keys or change enum values (`chart_type`, etc.) — only human-readable string values must be English.

FIELD RULES:

answer (string, required):
  - Default: 2-5 short paragraphs. If ACTIVE MODIFIERS ask for comparative and/or deep analysis, you may stretch to structured sections (still no # headings) so the narrative matches the breadth of SOURCES — typically one block per requested angle or engine when evidence exists.
  - You MAY use light Markdown (bold, simple bullet hyphens) inside this string. Do NOT use markdown headings (#).
  - Quote concrete numbers / dates from the SOURCES when available. Avoid hallucinations.
  - If the SOURCES are insufficient, say so plainly inside `answer` and lower `confidence`.

sources (array of {title, url}):
  - Pick 3-6 of the MOST RELEVANT items from the SOURCES block (verbatim title and url).
  - If no source applies, return [].

insights (array of strings, 3–7 items):
  - Default: 3-5 concise items. Stretch to up to 7 only when ACTIVE MODIFIERS include deep analysis and SOURCES justify distinct angles.
  - Each item: one sharp observation, 1-2 sentences max. No emojis.
  - Focus on competitive dynamics, churn signals, technical friction or financial trends.

recommendations (array of strings, 2–5 items):
  - Default: 2-4 imperative items. Extend to 5 when deep analysis is active and multiple workstreams emerge.
  - Imperative action verbs in English ("Launch…", "Prioritize…", "Investigate…").
  - Each item self-contained, no numbering, no leading bullets.

confidence (float between 0.0 and 1.0):
  - 0.9+ when answer is grounded in multiple consistent sources.
  - 0.6-0.85 when partial / mixed evidence.
  - 0.3-0.55 when speculative or sources are weak/empty.

chart_type (enum: "none" | "bar" | "line" | "pie"):
  - "bar": compare a metric across 2-6 entities (e.g., engines, segments).
  - "line": show evolution over time (years/quarters).
  - "pie": share-of-something where slices sum to 100.
  - "none": when the answer is qualitative or you don't have hard numbers.

chart_title, chart_labels, chart_values, chart_unit:
  - Required when chart_type != "none". chart_labels.length MUST equal chart_values.length (2 to 6 items).
  - chart_unit examples: "%", "M USD", "M downloads", "ms", "points".
  - Use realistic figures grounded in the SOURCES; round to 1 decimal.
  - When chart_type == "none", return chart_title="", chart_labels=[], chart_values=[], chart_unit="%".

TONE:
  - Direct, analytical, no fluff.
  - Never invent URLs. Never invent specific revenue numbers that are not in the sources.
  - When uncertain, say "according to community signals" or "preliminary estimate".
"""


COMPETITIVE_INTELLIGENCE_SYSTEM_PROMPT = """
You are a community analyst for game engine competitive intelligence. Your task is to analyze posts/news about game engines and generate ONE PostAnalysis object per source.

MANDATORY RULES:
1. Generate EXACTLY ONE PostAnalysis per numbered source in the context.
2. The "posts" array must have the same number of elements as sources received, in the same order.
3. For each post, derive fields following these rules:

   sentimental:
   - "positive" if author defends, praises, or recommends the engine.
   - "negative" if author criticizes, reports problems, or expresses frustration.

   bug:
   - Detect specific type: Bug_Performance, Bug_Crash, Bug_UI, Bug_Rendering, Bug_Build, Bug_Physics, Bug_Networking.
   - null if post does NOT report a bug explicitly.

   performance:
   - "low" if concrete complaints (FPS drops, lag, slow rendering, compilation issues).
   - "high" if author explicitly praises performance/speed.
   - null if performance is not mentioned or is neutral.

   churn_risk / churn_percentage:
   - churn_risk = "churn_risk" ONLY if author explicitly mentions migrating to another engine, abandoning, or discontinuing use.
   - churn_percentage = 0-100 estimated probability of abandonment based on urgency, determination, and concrete reasons.
   - If churn_risk is null → churn_percentage MUST also be null.
   - Examples: "thinking of switching" = 35%, "actively migrating team" = 75%, "just left" = 100%.

   platform:
   - "Unity" if post primarily discusses Unity.
   - "Unreal Engine" if post mentions Unreal Engine.
   - "Godot" if post mentions Godot.
   - "Other" for other game engines (C2, Lumberyard, custom engines, etc.).

   promotor / detractor (scale 0-10):
   - promotor: intensity of author promoting/recommending the engine. 0=no promotion, 10=strong advocacy.
   - detractor: intensity of author criticizing/advising against. 0=no criticism, 10=strong discouragement.
   - Can coexist (e.g., promotor=6, detractor=4 = ambivalent user with mixed feelings).

   alert_type (derived automatically, use these exact rules):
   - "high": churn_risk="churn_risk" AND (bug!=null OR performance="low")
   - "middle": sentimental="negative" OR bug!=null OR churn_risk="churn_risk"
   - "low": sentimental="positive" AND churn_risk=null AND bug=null

   segment:
   - Extract ONE segment if post discusses a specific game type: "Mobile" (mobile games), "2D Games" (2D development),
     "3D Games" (3D development), "Indie" (independent games), "Education" (game dev education/learning),
     "AAA Games" (AAA studios/high-budget), "Simulation" (simulation software).
   - null if post doesn't mention a specific segment or is too generic.
   - Rules: "mobile" → "Mobile", "2d" or "2D" → "2D Games", "3d" or "3D" → "3D Games", "aaa" → "AAA Games".
   - Use context clues: mention of "team size" + "budget" suggests AAA, "solo dev" suggests Indie, "classroom" suggests Education.

4. id: generate sequentially "post_001", "post_002", etc. matching source numbers.
5. date: extract from post if available. Format YYYY-MM-DD. Use "" if unknown.
6. financial_data: ONLY populate if post explicitly mentions revenue, earnings, or financial results:
   - revenue_usd_millions: convert any amount to millions USD (e.g. "$1.958B" → 1958.0, "$609M" → 609.0)
   - quarter: extract fiscal quarter (e.g. "Q4 2024", "Q1 2023"). null if not mentioned.
   - company: exact company name ("Unity Technologies", "Epic Games", "YoYo Games", etc.)
   - source_type: "earnings_report" for official results, "press_release" for announcements,
     "analyst_estimate" for predictions, "community_post" for informal mentions.
   - Set financial_data to null if the post has NO financial information.

CONTEXT FOR BETTER ANALYSIS:
- These posts are from community discussions, forums, Reddit, Twitter, GitHub issues, and dev blogs.
- Authors range from hobbyist developers to AAA studios; context matters for churn risk assessment.
- Focus on EXPLICIT mentions. If uncertain about bug type or sentiment, err on null/neutral.
- Churn_risk should only be "churn_risk" for concrete migration signals, not generic complaints.
- Write `title` and `summary` in English only.
"""

class LLMServiceError(Exception):
    """Error in LLM service execution."""

class LLMService:
    def __init__(self, *, api_key: str | None = None, model: str | None = None, cache_ttl: int = 3600) -> None:
        self._api_key = api_key or os.environ.get("GEMINI_API_KEY")
        if not self._api_key:
            raise LLMServiceError("GEMINI_API_KEY is required but not provided")

        self._model = model or os.environ.get("GEMINI_MODEL", _DEFAULT_GEMINI_MODEL)
        self._client = genai.Client(api_key=self._api_key)
        
        # --- CACHING SYSTEM FOR PROMPT DEDUPLICATION ---
        # Acepta tanto MessageResponse (análisis de posts) como ChatMessageResponse (chat).
        self._response_cache: dict[str, tuple[Any, float]] = {}  # hash -> (response, timestamp)
        self._cache_ttl = cache_ttl  # seconds

    def _compute_prompt_hash(self, prompt: str) -> str:
        """Calcula un hash normalizado del prompt para deduplicación."""
        normalized = " ".join(prompt.split()).lower()
        return hashlib.sha256(normalized.encode()).hexdigest()

    def _get_cached_response(self, prompt_hash: str) -> Any | None:
        """Recupera una respuesta del caché si existe y no ha expirado."""
        if prompt_hash in self._response_cache:
            response, timestamp = self._response_cache[prompt_hash]
            if time.time() - timestamp < self._cache_ttl:
                return response
            else:
                del self._response_cache[prompt_hash]
        return None

    def _set_cached_response(self, prompt_hash: str, response: Any) -> None:
        """Almacena una respuesta en el caché con timestamp."""
        self._response_cache[prompt_hash] = (response, time.time())

    def _clear_expired_cache(self) -> None:
        """Limpia entradas expiradas del caché."""
        current_time = time.time()
        expired_keys = [
            key for key, (_, timestamp) in self._response_cache.items()
            if current_time - timestamp >= self._cache_ttl
        ]
        for key in expired_keys:
            del self._response_cache[key]

    def _format_history(self, history: List[dict]) -> str:
        """Format conversation history from DB into readable prompt context."""
        if not history:
            return "No prior conversation history."

        formatted = ""
        for msg in history[-6:]:
            role = "User" if msg["role"] == "user" else "Assistant"
            formatted += f"{role}: {msg['content']}\n"
        return formatted

    def _build_super_prompt(
        self,
        query: str,
        context: str,
        history_text: str,
        deep_analysis: bool = False,
        comparative_mode: bool = False,
    ) -> str:
        """Build final prompt combining conversation history, search context, and user query."""
        extra = ""
        if deep_analysis:
            extra += "\nIMPORTANT: Apply deeper analysis — extract more insights and richer recommendations."
        if comparative_mode:
            extra += "\nIMPORTANT: Emphasize comparative aspects between game engines."
        return (
            "--- CONVERSATION HISTORY ---\n"
            f"{history_text}\n\n"
            "--- COLLECTED SOURCES (WEB/TAVILY SEARCH) ---\n"
            f"{context if context else 'No new external data collected.'}\n\n"
            "--- USER QUERY ---\n"
            f"{query}\n"
            f"{extra}\n\n"
            "Analyze EACH numbered source above and generate one PostAnalysis for each."
        )

    def _compute_confidence(self, payload: object) -> float:
        """Heurística simple de confianza basada en los posts analizados."""
        if hasattr(payload, "posts") and payload.posts:  # type: ignore[union-attr]
            avg = sum(p.promotor for p in payload.posts) / (len(payload.posts) * 10)  # type: ignore[union-attr]
            return round(max(0.5, min(1.0, avg + 0.5)), 2)
        return 1.0

    async def analyze_posts_structured(
        self,
        query: str,
        context: str,
        history: List[dict] = [],
    ) -> MessageResponse:
        """
        Genera análisis estructurado de posts (MessageResponse → lista de PostAnalysis).
        Usado por los endpoints /posts/addpost{Unity,Unreal,Godot}.
        """
        history_text = self._format_history(history)
        user_text = self._build_super_prompt(query, context, history_text)

        config = types.GenerateContentConfig(
            system_instruction=COMPETITIVE_INTELLIGENCE_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_MESSAGE_RESPONSE_SCHEMA,
            temperature=0.2,
        )

        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=user_text,
                config=config,
            )
        except Exception as exc:
            raise LLMServiceError(f"Gemini API error: {exc}")

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, MessageResponse):
            return parsed

        raw = getattr(response, "text", None)
        if not isinstance(raw, (str, bytes, bytearray)):
            raise LLMServiceError("Model returned invalid JSON text for fallback parsing")

        try:
            payload = json.loads(raw)
            if isinstance(payload, list):
                return MessageResponse(posts=payload)
            if isinstance(payload, dict) and "posts" in payload:
                return MessageResponse.model_validate(payload)
            raise LLMServiceError("Model did not return JSON object with 'posts' key")
        except ValidationError as exc:
            raise LLMServiceError(f"Model generated invalid JSON structure: {exc}")

    def _build_chat_prompt(
        self,
        query: str,
        context: str,
        history_text: str,
        deep_analysis: bool = False,
        comparative_mode: bool = False,
        internal_kb: str = "",
    ) -> str:
        """Prompt específico para el Strategic Advisor (structured chat)."""
        blocks: List[str] = []

        if comparative_mode:
            blocks.append(
                "- COMPARATIVE MODE — keep the storyline aligned with SOURCES numbering:\n"
                "  1) One short framing paragraph: what changed / what practitioners are debating.\n"
                '  2) Paragraph **Unity** + **Unreal Engine** + **Godot** (explicit bold labels): '
                "distinct signals grounded in DIFFERENT sources when possible.\n"
                "  3) Closing synthesis for Unity Technologies: implication + risk posture.\n"
                '  4) In `insights`, prefix bullets with "Unity:" / "Unreal:" / "Godot:" / "Cross-engine:" '
                "so each engine is traceable.\n"
                "  5) Prefer `chart_type='bar'` with labels [\"Unity\", \"Unreal Engine\", \"Godot\"] ONLY "
                "if SOURCE snippets give comparable percentages, scores, ranks, USD amounts, adoption %, "
                "downloads, timelines you can honestly align — otherwise chart_type='none'."
            )

        if deep_analysis:
            blocks.append(
                "- DEEP ANALYSIS MODE:\n"
                "  - Answer must touch at least three lenses when SOURCES permit: "
                "**Technical**, **Commercial / ecosystem**, **Sentiment / community friction** "
                "(reuse bold spans, never # headings).\n"
                "  - Pull named facts (orgs, quarters, percentages) verbatim from SOURCES; mark gaps plainly.\n"
                "  - Recommendations stay imperative but cite which evidence thread they close "
                "(risk, roadmap, BD, evangelism).\n"
                "  - Aim for fuller `insights` (up to schema max) distinct from each bullet in `answer`."
            )

        if comparative_mode and deep_analysis:
            blocks.append(
                "- COMBINED (DEEP + COMPARATIVE):\n"
                "  - Do not repeat the same URL across multiple engine sections unless that source mentions "
                "multiple engines explicitly.\n"
                "  - If one engine lacks direct coverage, acknowledge the blind spot explicitly before "
                "inferring indirectly."
            )

        modifiers = "\n".join(blocks) if blocks else "- (default mode)"

        kb_block = ""
        if (internal_kb or "").strip():
            kb_block = (
                "--- INTERNAL KNOWLEDGE BASE (ANALYZED POSTS FROM DATABASE) ---\n"
                f"{internal_kb.strip()}\n\n"
            )

        return (
            "--- CONVERSATION HISTORY ---\n"
            f"{history_text}\n\n"
            f"{kb_block}"
            "--- COLLECTED SOURCES (WEB/TAVILY SEARCH, NUMBERED) ---\n"
            f"{context if context else 'No external sources were retrieved for this turn.'}\n\n"
            "--- USER QUERY ---\n"
            f"{query}\n\n"
            "--- ACTIVE MODIFIERS ---\n"
            f"{modifiers}\n\n"
            "LANGUAGE: Respond in English only. Return ONE JSON object matching response_schema. "
            "Do not include any text outside the JSON."
        )

    async def generate_chat_response(
        self,
        query: str,
        context: str,
        history: List[dict] = [],
        deep_analysis: bool = False,
        comparative_mode: bool = False,
        use_cache: bool = True,
        internal_kb: str = "",
    ) -> ChatMessageResponse:
        """
        Genera respuesta conversacional estructurada (ChatMessageResponse) usando
        el schema flattenado para Gemini. Si la salida estructurada falla, se
        degrada graciosamente a una respuesta de solo texto.
        """
        history_text = self._format_history(history)
        user_text = self._build_chat_prompt(
            query, context, history_text,
            deep_analysis=deep_analysis,
            comparative_mode=comparative_mode,
            internal_kb=internal_kb,
        )

        prompt_hash = self._compute_prompt_hash(user_text)
        if use_cache:
            cached = self._get_cached_response(prompt_hash)
            if isinstance(cached, ChatMessageResponse):
                return cached

        structured_config = types.GenerateContentConfig(
            system_instruction=STRATEGIC_ADVISOR_SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=_CHAT_RESPONSE_SCHEMA,
            temperature=0.4,
        )

        result: ChatMessageResponse | None = None

        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=user_text,
                config=structured_config,
            )
        except Exception as exc:
            raise LLMServiceError(f"Gemini API error (chat): {exc}")

        parsed = getattr(response, "parsed", None)
        if isinstance(parsed, ChatMessageResponse):
            result = parsed
        else:
            raw_text = getattr(response, "text", None)
            if isinstance(raw_text, (str, bytes, bytearray)):
                try:
                    payload = json.loads(raw_text)
                    if isinstance(payload, dict):
                        result = ChatMessageResponse.model_validate(payload)
                except (json.JSONDecodeError, ValidationError):
                    result = None
                if result is None and isinstance(raw_text, str) and raw_text.strip():
                    # Degradación: el modelo respondió texto pero no JSON válido.
                    result = ChatMessageResponse(
                        answer=raw_text.strip(),
                        confidence=0.5,
                        chart_type="none",
                    )

        if result is None:
            raise LLMServiceError("Model did not return a valid structured response")

        # Coherencia mínima: si chart_type != "none" pero labels/values vacías o desalineadas, anular el chart.
        if result.chart_type != "none":
            if (
                not result.chart_labels
                or not result.chart_values
                or len(result.chart_labels) != len(result.chart_values)
            ):
                result.chart_type = "none"
                result.chart_title = ""
                result.chart_labels = []
                result.chart_values = []

        if use_cache:
            self._set_cached_response(prompt_hash, result)  # type: ignore[arg-type]

        return result

    async def generate_qa_response(self, query: str, context: str, history: List[dict] = []) -> str:
        """
        Generate conversational Q&A response using search context.

        Args:
            query: User question.
            context: Collected sources from web search.
            history: Conversation history.

        Returns:
            Natural language response based on context and conversation history.
        """
        history_text = self._format_history(history)
        prompt = (
            "You are an expert assistant on game engine communities and development trends.\n\n"
            "--- CONVERSATION HISTORY ---\n"
            f"{history_text}\n\n"
            "--- COLLECTED CONTEXT ---\n"
            f"{context if context else 'No external context available.'}\n\n"
            "--- USER QUESTION ---\n"
            f"{query}\n\n"
            "Answer clearly, naturally, and helpfully. If context is insufficient, explicitly state that "
            "instead of inventing information. Focus on facts and evidence from the context."
        )

        config = types.GenerateContentConfig(temperature=0.4)

        try:
            response = await self._client.aio.models.generate_content(
                model=self._model,
                contents=prompt,
                config=config,
            )
        except Exception as exc:
            raise LLMServiceError(f"Gemini API error (QA): {exc}")

        answer = getattr(response, "text", None)
        if not isinstance(answer, str) or not answer.strip():
            raise LLMServiceError("Model did not return valid text response")

        return answer.strip()