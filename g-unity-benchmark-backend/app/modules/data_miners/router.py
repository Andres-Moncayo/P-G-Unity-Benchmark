from __future__ import annotations

import asyncio
import csv
import io
from datetime import date as date_type
from math import ceil
import logging
from typing import Any, Literal

from fastapi import APIRouter, BackgroundTasks, Body, Depends, HTTPException, Query, status
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session, sessionmaker

from app.modules.data_miners.crud import save_analyzed_post
from app.modules.data_miners.crud import get_churn_reports, get_global_stats, get_market_signals, get_mined_posts_advanced, search_mined_posts
from app.modules.data_miners.schemas import PostAnalysis
from app.modules.data_miners.schemas import ChurnInsightResponse, MarketSignalsResponse, MiningStatsResponse, PaginatedResponse
from app.modules.data_miners.services.miner_llm import MinerLLMService
from app.modules.data_miners.services.miner_search import MinerSearchService
from app.modules.data_miners.utils import get_robust_keys, mark_gemini_key_failed, mark_tavily_key_failed
from core.database import get_postgres_db

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/miners", tags=["Data Miners"])

ENGINE_ORDER: tuple[str, ...] = ("unity", "unreal", "godot")
DEFAULT_PLATFORMS: tuple[str, ...] = (
    "reddit",
    "github",
    "stackoverflow",
    "hackernews",
    "discord",
    "youtube",
    "forums",
)


class RunAllEnginesRequest(BaseModel):
    platforms: list[str] | None = None
    engine: str = Field(default="all")
    limit: int = Field(default=5, ge=1, le=20)


def _search_results_to_context(results: list[dict[str, str]]) -> str:
    if not results:
        return ""

    blocks: list[str] = []
    for index, result in enumerate(results, start=1):
        blocks.append(
            f"{index}. Título: {result.get('title', 'Sin título')} | URL: {result.get('url')} | Contenido: {result.get('content', result.get('snippet', ''))}"
        )
    return "\n\n".join(blocks)


def _create_task_session(db_bind: Any) -> Session:
    return sessionmaker(bind=db_bind, autocommit=False, autoflush=False, class_=Session)()


def _to_post_analysis(record) -> PostAnalysis:
    return PostAnalysis.model_validate(record)


def _build_paginated_response(records: list, total_count: int, limit: int, offset: int) -> PaginatedResponse[PostAnalysis]:
    items = [_to_post_analysis(record) for record in records]
    total_pages = ceil(total_count / limit) if total_count and limit else 0
    return PaginatedResponse[PostAnalysis](
        data=items,
        total_pages=total_pages,
        count=len(items),
        total_count=total_count,
        limit=limit,
        offset=offset,
    )


def _record_to_csv_row(record: PostAnalysis) -> dict[str, Any]:
    return record.model_dump(mode="json")


def _build_csv_stream(records: list[PostAnalysis]) -> io.StringIO:
    buffer = io.StringIO()
    if not records:
        return buffer

    fieldnames = list(records[0].model_dump(mode="json").keys())
    writer = csv.DictWriter(buffer, fieldnames=fieldnames)
    writer.writeheader()
    for record in records:
        writer.writerow(_record_to_csv_row(record))
    buffer.seek(0)
    return buffer


async def _process_platform_task(
    platform: str,
    engine: str,
    limit: int,
    db_bind: Any,
) -> None:
    for attempt in range(3):
        tavily_key, gemini_key = get_robust_keys()
        logger.info(
            "data_miners attempt=%d platform=%s engine=%s tavily=%s gemini=%s",
            attempt + 1,
            platform,
            engine,
            f"{tavily_key[:4]}...{tavily_key[-4:]}" if len(tavily_key) > 8 else tavily_key,
            f"{gemini_key[:4]}...{gemini_key[-4:]}" if len(gemini_key) > 8 else gemini_key,
        )
        search_service = MinerSearchService(api_key=tavily_key)
        llm_service = MinerLLMService(api_key=gemini_key)
        task_session = _create_task_session(db_bind)
        try:
            try:
                search_results = await search_service.search_platform(platform, engine, max_results=limit)
            except Exception as exc:
                mark_tavily_key_failed(tavily_key)
                logger.warning(
                    "data_miners Tavily failed attempt=%d platform=%s engine=%s error=%s",
                    attempt + 1,
                    platform,
                    engine,
                    exc,
                )
                raise RuntimeError(f"Tavily search failed on attempt {attempt + 1}") from exc

            try:
                context = _search_results_to_context(search_results)
                mined_posts = await llm_service.analyze(engine, context)
            except Exception as exc:
                mark_gemini_key_failed(gemini_key)
                logger.warning(
                    "data_miners Gemini failed attempt=%d platform=%s engine=%s error=%s",
                    attempt + 1,
                    platform,
                    engine,
                    exc,
                )
                raise RuntimeError(f"Gemini analysis failed on attempt {attempt + 1}") from exc

            for post_data in mined_posts:
                save_analyzed_post(task_session, PostAnalysis.model_validate(post_data))
            logger.info("Mining completed for %s / %s on attempt %d", platform, engine, attempt + 1)
            break
        except Exception as exc:
            logger.warning("Mining attempt %d failed for %s / %s: %s", attempt + 1, platform, engine, exc)
            if attempt == 2:
                raise
            await asyncio.sleep(2)
        finally:
            task_session.close()


def _normalize_platforms(platforms: list[str] | None) -> list[str]:
    if not platforms:
        return list(DEFAULT_PLATFORMS)

    allowed = {platform.lower().strip() for platform in DEFAULT_PLATFORMS}
    normalized: list[str] = []
    for platform in platforms:
        cleaned = platform.lower().strip()
        if cleaned in allowed and cleaned not in normalized:
            normalized.append(cleaned)

    return normalized or list(DEFAULT_PLATFORMS)


def _normalize_engines(engine: str) -> list[str]:
    engine_key = engine.lower().strip()
    if engine_key == "all":
        return list(ENGINE_ORDER)
    if engine_key in ENGINE_ORDER:
        return [engine_key]

    raise HTTPException(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        detail='engine must be "unity", "unreal", "godot", or "all"',
    )


def _add_platform_task(
    background_tasks: BackgroundTasks,
    platform: str,
    engine: str,
    limit: int,
    db_bind: Any,
) -> None:
    background_tasks.add_task(_process_platform_task, platform, engine, limit, db_bind)


def _build_platform_endpoint(platform_name: str):
    async def _endpoint(
        background_tasks: BackgroundTasks,
        engine: Literal["unity", "unreal", "godot"] = Query(...),
        db: Session = Depends(get_postgres_db),
        limit: int = 5,
    ):
        try:
            db_bind = db.get_bind()
            background_tasks.add_task(_process_platform_task, platform_name, engine, limit, db_bind)
            return {"message": f"Mining started on {platform_name.title()} for {engine.title()}"}
        except Exception as exc:
            logger.exception("Mining failed for %s / %s: %s", platform_name, engine, exc)
            raise HTTPException(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=str(exc))

    return _endpoint


@router.post("/run-all-engines", status_code=status.HTTP_202_ACCEPTED)
async def run_all_engines(
    background_tasks: BackgroundTasks,
    payload: RunAllEnginesRequest = Body(default_factory=RunAllEnginesRequest),
    db: Session = Depends(get_postgres_db),
) -> dict[str, Any]:
    selected_platforms = _normalize_platforms(payload.platforms)
    selected_engines = _normalize_engines(payload.engine)
    db_bind = db.get_bind()

    tasks_queued = 0
    for platform in selected_platforms:
        for selected_engine in selected_engines:
            _add_platform_task(background_tasks, platform, selected_engine, payload.limit, db_bind)
            tasks_queued += 1

    return {"status": "Orchestration started", "tasks_queued": tasks_queued}


@router.post("/reddit", status_code=status.HTTP_202_ACCEPTED)
async def mine_reddit(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("reddit")(background_tasks, engine, db, limit)


@router.post("/github", status_code=status.HTTP_202_ACCEPTED)
async def mine_github(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("github")(background_tasks, engine, db, limit)


@router.post("/stackoverflow", status_code=status.HTTP_202_ACCEPTED)
async def mine_stackoverflow(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("stackoverflow")(background_tasks, engine, db, limit)


@router.post("/hackernews", status_code=status.HTTP_202_ACCEPTED)
async def mine_hackernews(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("hackernews")(background_tasks, engine, db, limit)


@router.post("/discord", status_code=status.HTTP_202_ACCEPTED)
async def mine_discord(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("discord")(background_tasks, engine, db, limit)


@router.post("/youtube", status_code=status.HTTP_202_ACCEPTED)
async def mine_youtube(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("youtube")(background_tasks, engine, db, limit)


@router.post("/forums", status_code=status.HTTP_202_ACCEPTED)
async def mine_forums(
    background_tasks: BackgroundTasks,
    engine: Literal["unity", "unreal", "godot"] = Query(...),
    db: Session = Depends(get_postgres_db),
    limit: int = 5,
):
    return await _build_platform_endpoint("forums")(background_tasks, engine, db, limit)


@router.get("/posts", response_model=PaginatedResponse[PostAnalysis])
def list_mined_posts(
    db: Session = Depends(get_postgres_db),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    platform_mentioned: str | None = Query(default=None),
    source_platform: str | None = Query(default=None),
    sentiment_label: str | None = Query(default=None),
    business_category: str | None = Query(default=None),
    alert_urgency: str | None = Query(default=None),
) -> PaginatedResponse[PostAnalysis]:
    records, total_count = get_mined_posts_advanced(
        db,
        limit=limit,
        offset=offset,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
    )
    return _build_paginated_response(records, total_count, limit, offset)


@router.get("/posts/search", response_model=PaginatedResponse[PostAnalysis])
def search_posts(
    db: Session = Depends(get_postgres_db),
    q: str | None = Query(default=None, min_length=1),
    search_date: date_type | None = Query(default=None, alias="date"),
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    platform_mentioned: str | None = Query(default=None),
    source_platform: str | None = Query(default=None),
    sentiment_label: str | None = Query(default=None),
    business_category: str | None = Query(default=None),
    alert_urgency: str | None = Query(default=None),
) -> PaginatedResponse[PostAnalysis]:
    records, total_count = search_mined_posts(
        db,
        q=q,
        search_date=search_date,
        limit=limit,
        offset=offset,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
    )
    return _build_paginated_response(records, total_count, limit, offset)


@router.get("/analytics/dashboard", response_model=MiningStatsResponse)
def analytics_dashboard(db: Session = Depends(get_postgres_db)) -> MiningStatsResponse:
    return get_global_stats(db)


@router.get("/analytics/churn-report", response_model=ChurnInsightResponse)
def analytics_churn_report(
    db: Session = Depends(get_postgres_db),
    engine: Literal["unity", "unreal", "godot"] | None = Query(default=None),
) -> ChurnInsightResponse:
    return ChurnInsightResponse(items=get_churn_reports(db, engine=engine))


@router.get("/analytics/market-signals", response_model=MarketSignalsResponse)
def analytics_market_signals(db: Session = Depends(get_postgres_db)) -> MarketSignalsResponse:
    return MarketSignalsResponse(items=get_market_signals(db))


@router.get("/export/csv")
def export_mined_posts_csv(
    db: Session = Depends(get_postgres_db),
    limit: int = Query(default=5000, ge=1, le=100000),
    offset: int = Query(default=0, ge=0),
    platform_mentioned: str | None = Query(default=None),
    source_platform: str | None = Query(default=None),
    sentiment_label: str | None = Query(default=None),
    business_category: str | None = Query(default=None),
    alert_urgency: str | None = Query(default=None),
    q: str | None = Query(default=None),
    search_date: date_type | None = Query(default=None, alias="date"),
) -> StreamingResponse:
    if q or search_date:
        records, _ = search_mined_posts(
            db,
            q=q,
            search_date=search_date,
            limit=limit,
            offset=offset,
            platform_mentioned=platform_mentioned,
            source_platform=source_platform,
            sentiment_label=sentiment_label,
            business_category=business_category,
            alert_urgency=alert_urgency,
        )
    else:
        records, _ = get_mined_posts_advanced(
            db,
            limit=limit,
            offset=offset,
            platform_mentioned=platform_mentioned,
            source_platform=source_platform,
            sentiment_label=sentiment_label,
            business_category=business_category,
            alert_urgency=alert_urgency,
        )

    analysis_rows = [_to_post_analysis(record) for record in records]
    csv_buffer = _build_csv_stream(analysis_rows)

    headers = {"Content-Disposition": 'attachment; filename="mined_posts.csv"'}
    return StreamingResponse(csv_buffer, media_type="text/csv", headers=headers)
