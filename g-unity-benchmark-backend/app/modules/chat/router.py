"""Router del chat: una sola tabla `chat_conversations` (campo JSONB `state`) + contexto de analyzed_posts."""
from __future__ import annotations

import logging
import uuid
from datetime import datetime, timezone
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session
from sqlalchemy.orm.attributes import flag_modified
from starlette.responses import Response

from app.modules.chat.models import ChatConversation
from app.modules.chat.schemas import (
    ChatFeedbackRequest,
    ChatMessageOut,
    ChatPostResponse,
    ChatRequest,
    ChatSourceItem,
    ChatVisualData,
    ConversationDetail,
    ConversationSummary,
)
from app.modules.identity.models import User
from core.config import settings
from core.database import get_postgres_db
from core.security import get_current_active_user
from app.services.llm import LLMService, LLMServiceError
from app.services.search import SearchService, SearchServiceError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/chat", tags=["Chat IA"])


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


def _conversation_for_user(
    pg_db: Session,
    *,
    conversation_id: str,
    user_id: uuid.UUID,
) -> ChatConversation:
    """Carga una conversación solo si pertenece al usuario autenticado (404 si no existe o no es suya)."""
    conv = (
        pg_db.query(ChatConversation)
        .filter(
            ChatConversation.id == conversation_id,
            ChatConversation.user_id == user_id,
        )
        .one_or_none()
    )
    if conv is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Conversación no encontrada.")
    return conv


def _normalize_state(raw: Any) -> dict[str, Any]:
    if not isinstance(raw, dict):
        return {"messages": [], "simulation": None}
    msgs = raw.get("messages")
    if not isinstance(msgs, list):
        msgs = []
    sim = raw.get("simulation")
    if sim is not None and not isinstance(sim, dict):
        sim = None
    return {"messages": msgs, "simulation": sim}


def _conv_state(conv: ChatConversation) -> dict[str, Any]:
    return _normalize_state(conv.state)


def _apply_state(conv: ChatConversation, state: dict[str, Any]) -> None:
    conv.state = state
    flag_modified(conv, "state")


def _parse_created_at(value: Any) -> datetime:
    if isinstance(value, datetime):
        return value
    if isinstance(value, str) and value.strip():
        try:
            s = value.replace("Z", "+00:00")
            return datetime.fromisoformat(s)
        except ValueError:
            pass
    return _utcnow()


def _search_results_to_context(results: Any) -> str:
    if results is None or results == []:
        return ""
    if isinstance(results, str):
        return results
    if not isinstance(results, list):
        logger.warning("_search_results_to_context: formato inesperado %s", type(results).__name__)
        return ""

    blocks: list[str] = []
    idx = 0
    for r in results:
        if not isinstance(r, dict):
            continue
        title = str(r.get("title") or "").strip()
        url = str(r.get("url") or "").strip()
        snippet = str(r.get("snippet") or r.get("content") or "").strip()
        if not title and not url:
            continue
        idx += 1
        blocks.append(f"{idx}. {title}\n   URL: {url}\n   Resumen: {snippet}")
    return "\n\n".join(blocks)


def _normalize_sources(raw: Any) -> list[ChatSourceItem]:
    if not raw:
        return []
    out: list[ChatSourceItem] = []
    if isinstance(raw, str):
        return [ChatSourceItem(title=raw, url=raw)]
    if not isinstance(raw, list):
        return out
    for item in raw:
        if isinstance(item, str):
            out.append(ChatSourceItem(title=item, url=item))
        elif isinstance(item, dict):
            url = str(item.get("url") or item.get("href") or "").strip()
            title = str(item.get("title") or item.get("name") or url or "Source").strip()
            if url:
                out.append(ChatSourceItem(title=title or url, url=url))
    return out


def _msg_visual_data(visual_raw: Any) -> ChatVisualData | None:
    if isinstance(visual_raw, dict) and visual_raw.get("chart_type") and visual_raw.get("chart_type") != "none":
        return ChatVisualData(
            chart_type=str(visual_raw.get("chart_type", "none")),
            title=str(visual_raw.get("title", "")),
            labels=[str(x) for x in visual_raw.get("labels") or []],
            values=[float(x) for x in visual_raw.get("values") or []],
            unit=str(visual_raw.get("unit", "%")),
        )
    return None


def _stored_message_to_out(msg: dict) -> ChatMessageOut | None:
    role = msg.get("role")
    if role not in ("user", "assistant"):
        return None
    mid = msg.get("id")
    if not isinstance(mid, str):
        return None
    content = str(msg.get("content") or "")
    created = _parse_created_at(msg.get("created_at"))
    conf_raw = msg.get("confidence")
    conf_f: float | None = float(conf_raw) if isinstance(conf_raw, (int, float)) else None
    return ChatMessageOut(
        id=mid,
        role=role,
        content=content,
        created_at=created,
        sources=_normalize_sources(msg.get("sources")),
        insights=list(msg["insights"]) if isinstance(msg.get("insights"), list) else [],
        recommendations=list(msg["recommendations"]) if isinstance(msg.get("recommendations"), list) else [],
        visual_data=_msg_visual_data(msg.get("visual_data")),
        confidence=conf_f,
    )


def _conversation_title_from_query(query: str, max_len: int = 80) -> str:
    text = " ".join(query.split())
    if len(text) <= max_len:
        return text or "New conversation"
    return text[: max_len - 1].rstrip() + "…"


def _post_response_from_llm(
    llm_response: Any,
    *,
    conversation_id: str,
    title: str,
    assistant_message_id: str,
) -> ChatPostResponse:
    visual: ChatVisualData | None = None
    if getattr(llm_response, "chart_type", "none") != "none":
        visual = ChatVisualData(
            chart_type=llm_response.chart_type,
            title=llm_response.chart_title or "",
            labels=list(llm_response.chart_labels or []),
            values=list(llm_response.chart_values or []),
            unit=llm_response.chart_unit or "%",
        )
    return ChatPostResponse(
        **llm_response.model_dump(),
        conversation_id=conversation_id,
        title=title,
        assistant_message_id=assistant_message_id,
        visual_data=visual,
    )


def _enum_or_str(value: Any) -> str:
    if value is None:
        return "n/a"
    return str(getattr(value, "value", value))


def _format_analyzed_posts_kb(pg_db: Session, limit: int = 20) -> str:
    try:
        with pg_db.begin_nested():
            cols = {
                row[0]
                for row in pg_db.execute(
                    text(
                        "SELECT column_name FROM information_schema.columns "
                        "WHERE table_name = 'analyzed_posts'"
                    )
                ).fetchall()
            }
            if not cols:
                return ""

            created_at_expr = "created_at" if "created_at" in cols else "NULL::timestamp"
            date_expr = (
                f"COALESCE(date_post, {created_at_expr})"
                if "date_post" in cols
                else created_at_expr
            )
            if "platform_mentioned" in cols:
                platform_expr = "platform_mentioned"
            elif "platform" in cols:
                platform_expr = "platform"
            else:
                platform_expr = "'unknown'"
            sentiment_expr = (
                "sentiment_label::text"
                if "sentiment_label" in cols
                else ("sentimental" if "sentimental" in cols else "'neutral'")
            )
            alert_expr = (
                "alert_type::text" if "alert_type" in cols else "'low'"
            )
            segment_expr = (
                "user_segment"
                if "user_segment" in cols
                else ("segment" if "segment" in cols else "NULL")
            )

            rows = pg_db.execute(
                text(
                    f"""
                    SELECT
                        title,
                        summary,
                        url,
                        {platform_expr} AS platform,
                        {sentiment_expr} AS sentiment_label,
                        {alert_expr} AS alert_type,
                        {segment_expr} AS user_segment
                    FROM analyzed_posts
                    ORDER BY {date_expr} DESC NULLS LAST, id DESC
                    LIMIT :limit
                    """
                ),
                {"limit": limit},
            ).mappings().all()
    except SQLAlchemyError as exc:
        logger.warning("analyzed_posts: lectura para contexto IA omitida: %s", exc)
        return ""
    except Exception as exc:
        logger.warning("analyzed_posts: lectura para contexto IA omitida: %s", exc)
        return ""
    if not rows:
        return ""
    blocks: list[str] = []
    for i, p in enumerate(rows, start=1):
        summ = (p.get("summary") or "")[:500]
        blocks.append(
            f"{i}. [{p.get('platform') or 'unknown'}] {p.get('title') or ''}\n"
            f"   Resumen: {summ}\n"
            f"   Sentimiento: {_enum_or_str(p.get('sentiment_label'))}; "
            f"Alerta: {_enum_or_str(p.get('alert_type'))}; "
            f"Segmento: {p.get('user_segment') or 'n/a'}\n"
            f"   URL: {p.get('url') or 'n/a'}",
        )
    return "\n\n".join(blocks)


def _simulation_snapshot_for_detail(state: dict[str, Any]) -> dict[str, Any] | None:
    sim = state.get("simulation")
    if not isinstance(sim, dict):
        return None
    last = sim.get("last_run")
    return last if isinstance(last, dict) else None


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_chat_conversations(
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> list[ConversationSummary]:
    try:
        rows = (
            pg_db.query(ChatConversation)
            .filter(ChatConversation.user_id == current_user.id)
            .order_by(ChatConversation.updated_at.desc(), ChatConversation.created_at.desc())
            .limit(200)
            .all()
        )
    except Exception as exc:
        logger.exception("list_chat_conversations: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo cargar el historial de conversaciones.",
        ) from exc

    result: list[ConversationSummary] = []
    for conv in rows:
        st = _conv_state(conv)
        msgs = st.get("messages")
        count = len(msgs) if isinstance(msgs, list) else 0
        created = conv.created_at if isinstance(conv.created_at, datetime) else _utcnow()
        updated = conv.updated_at if isinstance(conv.updated_at, datetime) else created
        result.append(
            ConversationSummary(
                id=conv.id,
                title=conv.title or "New conversation",
                created_at=created,
                updated_at=updated,
                message_count=count,
            )
        )
    return result


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_chat_conversation(
    conversation_id: str,
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ConversationDetail:
    try:
        conv = _conversation_for_user(
            pg_db,
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("get_chat_conversation: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No se pudo leer la conversación.") from exc

    st = _conv_state(conv)
    raw_msgs = st.get("messages") if isinstance(st.get("messages"), list) else []
    messages_out: list[ChatMessageOut] = []
    for m in raw_msgs:
        if isinstance(m, dict):
            out = _stored_message_to_out(m)
            if out:
                messages_out.append(out)

    created = conv.created_at if isinstance(conv.created_at, datetime) else _utcnow()
    updated = conv.updated_at if isinstance(conv.updated_at, datetime) else created

    return ConversationDetail(
        id=conversation_id,
        title=conv.title or "New conversation",
        created_at=created,
        updated_at=updated,
        message_count=len(messages_out),
        messages=messages_out,
        simulation=_simulation_snapshot_for_detail(st),
    )


@router.delete(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def delete_chat_conversation(
    conversation_id: str,
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Response:
    try:
        conv = _conversation_for_user(
            pg_db,
            conversation_id=conversation_id,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("delete_chat_conversation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo verificar la conversación.",
        ) from exc

    try:
        pg_db.delete(conv)
        pg_db.commit()
    except Exception as exc:
        pg_db.rollback()
        logger.exception("delete_chat_conversation: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No se pudo eliminar la conversación.",
        ) from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/feedback/",
    status_code=status.HTTP_204_NO_CONTENT,
    response_class=Response,
)
async def post_chat_feedback(
    body: ChatFeedbackRequest,
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> Response:
    try:
        conv = _conversation_for_user(
            pg_db,
            conversation_id=body.conversation_id,
            user_id=current_user.id,
        )
    except HTTPException:
        raise
    except Exception as exc:
        logger.exception("post_chat_feedback: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No se pudo verificar la conversación.") from exc

    st = _conv_state(conv)
    msgs = st.get("messages")
    if not isinstance(msgs, list):
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado en la conversación.")

    found = False
    now_iso = _utcnow().isoformat()
    new_msgs: list[Any] = []
    for m in msgs:
        if not isinstance(m, dict):
            new_msgs.append(m)
            continue
        if m.get("id") == body.message_id and m.get("role") == "assistant":
            m = {**m, "user_feedback": body.feedback, "feedback_at": now_iso}
            found = True
        new_msgs.append(m)

    if not found:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado en la conversación.")

    st = {**st, "messages": new_msgs}
    try:
        _apply_state(conv, st)
        conv.updated_at = _utcnow()
        pg_db.commit()
    except Exception as exc:
        pg_db.rollback()
        logger.exception("post_chat_feedback: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No se pudo guardar el feedback.") from exc

    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/", response_model=ChatPostResponse)
async def post_chat_message(
    request: ChatRequest,
    pg_db: Annotated[Session, Depends(get_postgres_db)],
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> ChatPostResponse:
    query = request.query.strip()
    conversation_title = "New conversation"

    try:
        if request.conversation_id:
            conv = _conversation_for_user(
                pg_db,
                conversation_id=request.conversation_id,
                user_id=current_user.id,
            )
            conversation_id = conv.id
            conversation_title = conv.title or "New conversation"
        else:
            conversation_id = uuid.uuid4().hex
            conv = ChatConversation(
                id=conversation_id,
                user_id=current_user.id,
                title="New conversation",
                state={},
            )
            pg_db.add(conv)
    except HTTPException:
        raise
    except Exception as exc:
        pg_db.rollback()
        logger.exception("post_chat_message: crear/obtener conversación: %s", exc)
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail="No se pudo acceder a la conversación.") from exc

    internal_kb = _format_analyzed_posts_kb(pg_db)

    st = _conv_state(conv)
    msgs: list[dict[str, Any]] = [m for m in st.get("messages", []) if isinstance(m, dict)]
    history_for_llm = [{"role": m["role"], "content": m.get("content", "")} for m in msgs[-10:] if m.get("role") in ("user", "assistant")]

    user_message_id = uuid.uuid4().hex
    user_doc: dict[str, Any] = {
        "id": user_message_id,
        "role": "user",
        "content": query,
        "created_at": _utcnow().isoformat(),
    }
    msgs.append(user_doc)

    if conv.title in (None, "", "New conversation", "Nueva conversación"):
        conversation_title = _conversation_title_from_query(query)

    deep = request.deep_analysis
    comp = request.comparative_mode
    if deep and comp:
        max_results = 16
    elif deep:
        max_results = 11
    elif comp:
        max_results = 9
    else:
        max_results = 5
    search_depth = "advanced" if (deep or comp) else "basic"
    if deep and comp:
        days_filter: int | None = 45
    elif deep:
        days_filter = 21
    elif comp:
        days_filter = 60
    else:
        days_filter = None

    search = SearchService()
    try:
        hits = await search.search_competitive_news(
            query,
            max_results=max_results,
            days=days_filter,
            search_depth=search_depth,
            comparative_mode=comp,
            deep_analysis=deep,
        )
    except SearchServiceError as exc:
        logger.warning("post_chat_message: búsqueda web fallida: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"Búsqueda web no disponible: {exc}") from exc

    context = _search_results_to_context(hits)

    llm = LLMService(api_key=settings.GEMINI_API_KEY, model=settings.GEMINI_MODEL)
    try:
        llm_response = await llm.generate_chat_response(
            query,
            context,
            history=history_for_llm,
            deep_analysis=deep,
            comparative_mode=comp,
            internal_kb=internal_kb,
        )
    except LLMServiceError as exc:
        logger.warning("post_chat_message: LLM fallido: %s", exc)
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=f"El modelo no pudo generar la respuesta: {exc}") from exc

    if not llm_response.sources and isinstance(hits, list) and hits:
        from app.services.llm import ChatSourceItem as _LLMChatSource

        fallback_sources: list[_LLMChatSource] = []
        for hit in hits[: min(len(hits), 10)]:
            if not isinstance(hit, dict):
                continue
            url = str(hit.get("url") or "").strip()
            title = str(hit.get("title") or url or "Source").strip()
            if url:
                fallback_sources.append(_LLMChatSource(title=title, url=url))
        if fallback_sources:
            llm_response.sources = fallback_sources

    sources_doc: list[dict[str, str]] | None = (
        [s.model_dump() for s in llm_response.sources] if llm_response.sources else None
    )

    visual_data_doc = (
        {
            "chart_type": llm_response.chart_type,
            "title": llm_response.chart_title,
            "labels": llm_response.chart_labels,
            "values": llm_response.chart_values,
            "unit": llm_response.chart_unit,
        }
        if llm_response.chart_type != "none"
        else None
    )

    assistant_message_id = uuid.uuid4().hex
    assistant_doc: dict[str, Any] = {
        "id": assistant_message_id,
        "role": "assistant",
        "content": llm_response.answer,
        "created_at": _utcnow().isoformat(),
        "sources": sources_doc,
        "insights": list(llm_response.insights or []),
        "recommendations": list(llm_response.recommendations or []),
        "visual_data": visual_data_doc,
        "confidence": llm_response.confidence,
    }

    msgs.append(assistant_doc)
    st2 = {**st, "messages": msgs}

    try:
        conv.title = conversation_title
        _apply_state(conv, st2)
        conv.updated_at = _utcnow()
        pg_db.commit()
    except Exception as exc:
        pg_db.rollback()
        logger.exception("post_chat_message: persistencia conversación falló: %s", exc)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="La respuesta se generó pero no pudo guardarse. Intenta de nuevo.",
        ) from exc

    return _post_response_from_llm(
        llm_response,
        conversation_id=conversation_id,
        title=conversation_title,
        assistant_message_id=assistant_message_id,
    )