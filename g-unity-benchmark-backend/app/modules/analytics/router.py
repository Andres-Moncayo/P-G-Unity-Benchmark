"""Router de Analytics: agregaciones sobre la tabla `posts` (migración 001)."""

from __future__ import annotations



import logging



from fastapi import APIRouter, Depends, Query

from sqlalchemy import text

from sqlalchemy.exc import SQLAlchemyError

from sqlalchemy.orm import Session



from app.modules.analytics.posts_aggregate import (

    build_analytics_summary_from_posts,

    get_developer_satisfaction_from_posts,

    get_global_sentiment_nps_from_posts,

    get_market_share_trend_from_posts,

    get_market_share_vs_satisfaction_from_posts,

    get_performance_gap_from_posts,

    get_satisfaction_by_dimension_from_posts,

)

from app.modules.analytics.schemas import (

    AnalyticsSummaryItem,

    DeveloperSatisfactionItem,

    GlobalSentimentNpsResponse,

    MarketShareTrendItem,

    MarketShareVsSatisfactionItem,

    PerformanceGapItem,

    SatisfactionByDimensionItem,

)

from core.database import get_db
from core.security import get_current_active_user



logger = logging.getLogger(__name__)

router = APIRouter(
    tags=["Analytics"],
    dependencies=[Depends(get_current_active_user)],
)





@router.get("/summary", response_model=list[AnalyticsSummaryItem])

def get_analytics_summary(

    db: Session = Depends(get_db),

    business: str | None = Query(

        None,

        description=(

            "Strategic pillar filter: general | producto | finanzas | ecosistema | posicionamiento "

            "(English aliases accepted). Subsets analyzed posts before aggregation."

        ),

    ),

):

    """KPIs agregados desde posts analizados (máx. 8)."""

    return build_analytics_summary_from_posts(db, business=business)





@router.get("/market-share-trend", response_model=list[MarketShareTrendItem])

def get_market_share_trend_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """Cuota de voz por trimestre (% de posts por motor) desde `posts`."""

    result = get_market_share_trend_from_posts(db, business=business)

    logger.info("market-share-trend: %s quarters from posts", len(result))

    return result





@router.get("/performance-gap", response_model=list[PerformanceGapItem])

def get_performance_gap_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """Proxies de engagement y churn por motor (mismas claves que el gráfico legacy)."""

    return get_performance_gap_from_posts(db, business=business)





@router.get("/global-sentiment-nps", response_model=GlobalSentimentNpsResponse)

def get_global_sentiment_nps_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """NPS aproximado y % de sentimiento por motor (`would_recommend` + `sentiment_label`)."""

    return get_global_sentiment_nps_from_posts(db, business=business)





@router.get("/developer-satisfaction", response_model=list[DeveloperSatisfactionItem])

def get_developer_satisfaction_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """Satisfacción media (sentiment_score / would_recommend → 0..10) por año y `platform_mentioned`."""

    return get_developer_satisfaction_from_posts(db, business=business)





@router.get("/market-share-vs-satisfaction", response_model=list[MarketShareVsSatisfactionItem])

def get_market_share_vs_satisfaction_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """Voz de marca (% posts) vs satisfacción media por segmento."""

    rows = get_market_share_vs_satisfaction_from_posts(db, business=business)

    logger.info("market-share-vs-satisfaction: %s rows", len(rows))

    return rows





@router.get("/satisfaction-by-dimension", response_model=list[SatisfactionByDimensionItem])

def get_satisfaction_by_dimension_endpoint(

    db: Session = Depends(get_db),

    business: str | None = Query(None, description="Strategic pillar filter (see /summary)."),

):

    """Por categoría inferida del campo `bug` (performance, crash, ui, api, documentation)."""

    return get_satisfaction_by_dimension_from_posts(db, business=business)





@router.get("/_diagnostics", include_in_schema=False)

def diagnostics(db: Session = Depends(get_db)):

    """Diagnóstico de conectividad y tablas disponibles. Útil para depurar 500/empty."""

    info: dict[str, object] = {"db_reachable": False}

    try:

        info["server_version"] = db.execute(text("SHOW server_version")).scalar()

        info["current_database"] = db.execute(text("SELECT current_database()")).scalar()

        info["current_user"] = db.execute(text("SELECT current_user")).scalar()

        info["search_path"] = db.execute(text("SHOW search_path")).scalar()

        tables = db.execute(

            text(

                """

                SELECT table_schema || '.' || table_name AS qname

                FROM information_schema.tables

                WHERE table_schema NOT IN ('pg_catalog','information_schema')

                ORDER BY 1

                """

            )

        ).scalars().all()

        info["tables"] = tables

        info["has_posts"] = db.execute(text("SELECT to_regclass('public.posts')")).scalar() is not None

        info["has_analyzed_posts"] = db.execute(text("SELECT to_regclass('public.analyzed_posts')")).scalar() is not None

        info["db_reachable"] = True

    except SQLAlchemyError as e:

        info["error"] = str(getattr(e, "orig", e))

    return info


