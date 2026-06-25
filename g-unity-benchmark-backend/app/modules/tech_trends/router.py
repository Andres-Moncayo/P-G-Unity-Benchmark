from __future__ import annotations

import asyncio
import logging
from math import ceil
from typing import Any

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session, sessionmaker

from app.modules.data_miners.utils import get_robust_keys, mark_gemini_key_failed, mark_tavily_key_failed
from app.modules.tech_trends.crud import (
    get_highlights,
    get_post_highlights,
    group_posts_by_engine_and_category,
    save_highlight,
    save_post_highlight,
)
from app.modules.tech_trends.models import Highlight as HighlightModel
from app.modules.tech_trends.models import PostHighlight as PostHighlightModel
from app.modules.tech_trends.schemas import (
    Highlight,
    HighlightsResponse,
    PaginatedResponse,
    PostHighlight,
    PostHighlightsResponse,
    ScrapeRequest,
    SummarizeRequest,
    TechCategory,
)
from app.modules.tech_trends.services.analyst_llm import TechTrendsAnalystLLMService
from app.modules.tech_trends.services.highlighter_llm import TechTrendsHighlighterLLMService
from app.modules.tech_trends.services.search_service import TechTrendsSearchService
from core.database import get_postgres_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/tech-trends", tags=["Tech Trends"])


def _create_task_session(db_bind: Any) -> Session:
    return sessionmaker(bind=db_bind, autocommit=False, autoflush=False, class_=Session)()


def _to_post_highlight(record: PostHighlightModel) -> PostHighlight:
    return PostHighlight.model_validate(record)


def _to_highlight(record: HighlightModel) -> Highlight:
    return Highlight.model_validate(record)


def _build_paginated_response(records: list, total_count: int, limit: int, offset: int) -> PaginatedResponse[Any]:
    total_pages = ceil(total_count / limit) if total_count and limit else 0
    return PaginatedResponse[Any](
        data=[record for record in records],
        total_pages=total_pages,
        count=len(records),
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


def _search_results_to_context(results: list[dict[str, str]]) -> str:
    if not results:
        return ""

    blocks: list[str] = []
    for index, result in enumerate(results, start=1):
        blocks.append(
            f"{index}. {result.get('title', '')}\n"
            f"URL: {result.get('url', '')}\n"
            f"Date: {result.get('date', '')}\n"
            f"Snippet: {result.get('snippet', '')}"
        )
    return "\n\n".join(blocks)


async def _process_scrape_task(
    payload: ScrapeRequest,
    db_bind: Any,
) -> None:
    for attempt in range(3):
        tavily_key, gemini_key = get_robust_keys()
        search_service = TechTrendsSearchService(api_key=tavily_key)
        llm_service = TechTrendsAnalystLLMService(api_key=gemini_key)
        task_session = _create_task_session(db_bind)
        try:
            try:
                search_results = await search_service.search_trends(max_results=payload.limit, days=payload.days)
                logger.info("🔍 Tavily encontró %d resultados de búsqueda.", len(search_results))
            except Exception as exc:
                mark_tavily_key_failed(tavily_key)
                logger.warning(
                    "Tech Trends scrape Tavily failed attempt=%d tavily=%s error=%s",
                    attempt + 1,
                    f"{tavily_key[:4]}...{tavily_key[-4:]}" if len(tavily_key) > 8 else tavily_key,
                    exc,
                )
                raise

            try:
                context = _search_results_to_context(search_results)
                posts = await llm_service.analyze(context)
                logger.info("🤖 Gemini analizó el contexto y generó %d posts.", len(posts))
                logger.info("📄 Contenido crudo de posts: %s", str(posts)) # Para ver qué estructura trae
            except Exception as exc:
                mark_gemini_key_failed(gemini_key)
                logger.warning(
                    "Tech Trends scrape Gemini failed attempt=%d gemini=%s error=%s",
                    attempt + 1,
                    f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else gemini_key,
                    exc,
                )
                raise

            if not posts:
                logger.warning("⚠️ La lista 'posts' está vacía. El bucle de guardado no se ejecutará.")

            for post_data in posts:
                db_model = PostHighlight.model_validate(post_data)
                logger.info("💾 Intentando guardar post con URL: %s", db_model.url)
                save_post_highlight(task_session, db_model)
                logger.info("💾 Datos post guardados con URL: %s", db_model.url)

            logger.info("Tech Trends scrape completed on attempt %d", attempt + 1)
            break
        except Exception as exc:
            logger.warning("Tech Trends scrape attempt %d failed: %s", attempt + 1, exc)
            if attempt == 2:
                raise
            await asyncio.sleep(2)
        finally:
            task_session.close()


async def _process_summarize_task(
    payload: SummarizeRequest,
    db_bind: Any,
) -> None:
    task_session = _create_task_session(db_bind)
    try:
        posts, _ = get_post_highlights(
            task_session,
            category=payload.category,
            game_engine=payload.game_engine,
            limit=10000,
            offset=0,
        )
        grouped = group_posts_by_engine_and_category(posts)
        for (game_engine, category), grouped_posts in grouped.items():
            if len(grouped_posts) < payload.min_posts:
                continue

            for attempt in range(3):
                _, gemini_key = get_robust_keys()
                llm_service = TechTrendsHighlighterLLMService(api_key=gemini_key)
                try:
                    highlight_payload = await llm_service.create_executive_highlight(grouped_posts)
                    highlight_data = highlight_payload["highlight"]
                    highlight_data["game_engine"] = game_engine
                    highlight_data["category"] = category.value if category else None
                    save_highlight(task_session, Highlight.model_validate(highlight_data))
                    logger.info(
                        "Tech Trends summarize completed for engine=%s category=%s on attempt %d",
                        game_engine,
                        category.value if category else None,
                        attempt + 1,
                    )
                    break
                except Exception as exc:
                    mark_gemini_key_failed(gemini_key)
                    logger.warning(
                        "Tech Trends summarize failed attempt=%d gemini=%s engine=%s category=%s error=%s",
                        attempt + 1,
                        f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else gemini_key,
                        game_engine,
                        category.value if category else None,
                        exc,
                    )
                    if attempt == 2:
                        raise
                    await asyncio.sleep(2)
    finally:
        task_session.close()


@router.post("/scrape", status_code=status.HTTP_202_ACCEPTED)
async def scrape_tech_trends(
    background_tasks: BackgroundTasks,
    payload: ScrapeRequest = Body(default_factory=ScrapeRequest),
    db: Session = Depends(get_postgres_db),
) -> dict[str, Any]:
    try:
        db_bind = db.get_bind()
        background_tasks.add_task(_process_scrape_task, payload, db_bind)
        return {"message": "Tech trends scrape started", "results_queued": payload.limit}
    except Exception as exc:
        logger.exception("Tech trends scrape failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.post("/summarize", status_code=status.HTTP_202_ACCEPTED)
async def summarize_tech_trends(
    background_tasks: BackgroundTasks,
    payload: SummarizeRequest = Body(default_factory=SummarizeRequest),
    db: Session = Depends(get_postgres_db),
) -> dict[str, Any]:
    try:
        db_bind = db.get_bind()
        background_tasks.add_task(_process_summarize_task, payload, db_bind)
        return {"message": "Tech trends summarization started", "min_posts": payload.min_posts}
    except Exception as exc:
        logger.exception("Tech trends summarization failed: %s", exc)
        raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))


@router.get("/highlights", response_model=HighlightsResponse)
def list_tech_trend_highlights(
    db: Session = Depends(get_postgres_db),
    limit: int = Query(default=200, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    category: str | None = Query(default=None),
    game_engine: str | None = Query(default=None),
) -> HighlightsResponse:
    category_value = None
    if category:
        try:
            category_value = TechCategory(category)
        except ValueError as exc:
            raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_ENTITY, detail="Invalid category") from exc

    records, _ = get_highlights(
        db,
        category=category_value,
        game_engine=game_engine,
        limit=limit,
        offset=offset,
    )
    return HighlightsResponse(items=[_to_highlight(record) for record in records])
