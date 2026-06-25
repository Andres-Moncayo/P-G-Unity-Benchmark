"""Router del módulo Competitors.

Expone endpoints agregados calculados desde analyzed_posts (PostgreSQL).
No requiere autenticación — datos de inteligencia competitiva son públicos
dentro de la aplicación.
"""
from __future__ import annotations

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from core.database import get_postgres_db
from sqlalchemy.orm import Session

from app.modules.competitors.crud import (
    get_competitors_dashboard,
    get_critical_alerts,
    get_engine_metrics,
    get_market_positioning,
    get_pulse,
    get_recent_posts,
    get_revenue_comparison,
    get_strategic_initiatives,
)
from app.modules.competitors.schemas import (
    AlertItem,
    CompetitorsDashboardResponse,
    EngineMetric,
    MarketPositioningItem,
    PlatformPulse,
    RecentPostItem,
    RevenueComparisonResponse,
    StrategicInitiativeItem,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/competitors", tags=["Competitors"])


@router.get("/dashboard", response_model=CompetitorsDashboardResponse)
def competitors_dashboard(
    db: Annotated[Session, Depends(get_postgres_db)],
    target_platform: str = Query("unity", description="Platform to treat as the reference (e.g. unity, unreal, godot)"),
):
    """Full competitors dashboard: metrics, pulse, alerts and recent posts for the target platform."""
    try:
        return get_competitors_dashboard(db, target_platform=target_platform)
    except Exception as exc:
        logger.exception("Error building competitors dashboard: %s", exc)
        raise HTTPException(status_code=500, detail=f"Error building dashboard: {exc}")


@router.get("/engines", response_model=list[EngineMetric])
def list_engine_metrics(
    db: Annotated[Session, Depends(get_postgres_db)],
):
    """Métricas agregadas por motor (NPS, sentimiento, churn, alertas)."""
    try:
        return get_engine_metrics(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/pulse", response_model=list[PlatformPulse])
def competitive_pulse(
    db: Annotated[Session, Depends(get_postgres_db)],
):
    """Pulso competitivo: % positivo, negativo y churn por plataforma."""
    try:
        engines = get_engine_metrics(db)
        return get_pulse(db, engines)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/alerts", response_model=list[AlertItem])
def critical_alerts(
    db: Annotated[Session, Depends(get_postgres_db)],
    limit: int = Query(10, ge=1, le=50),
):
    """Posts con alert_type=high o middle, ordenados por fecha."""
    try:
        return get_critical_alerts(db, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/recent-posts", response_model=list[RecentPostItem])
def recent_competitor_posts(
    db: Annotated[Session, Depends(get_postgres_db)],
    limit: int = Query(30, ge=1, le=100),
):
    """Últimos posts analizados de competidores (plataformas != unity)."""
    try:
        return get_recent_posts(db, limit=limit)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/revenue", response_model=RevenueComparisonResponse)
def revenue_comparison(
    db: Annotated[Session, Depends(get_postgres_db)],
):
    """
    Comparativa de ingresos por trimestre extraída automáticamente por el LLM
    desde posts sobre earnings reports y noticias financieras.
    """
    try:
        return get_revenue_comparison(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/market-positioning", response_model=list[MarketPositioningItem])
def list_market_positioning(
    db: Annotated[Session, Depends(get_postgres_db)],
):
    """Posicionamiento de mercado por motor y segmento, derivado de analyzed_posts."""
    try:
        return get_market_positioning(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")


@router.get("/strategic-initiatives", response_model=list[StrategicInitiativeItem])
def list_strategic_initiatives(
    db: Annotated[Session, Depends(get_postgres_db)],
):
    """Iniciativas estratégicas de competidores derivadas de analyzed_posts."""
    try:
        return get_strategic_initiatives(db)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Error: {exc}")