"""DTOs de respuesta para el módulo Competitors.

Todos los datos se derivan de la tabla analyzed_posts (PostgreSQL),
agrupando y calculando métricas por plataforma a partir de los posts
analizados por el LLM.
"""
from __future__ import annotations

from datetime import datetime
from typing import Optional
from pydantic import BaseModel


class EngineMetric(BaseModel):
    """Market share y NPS calculado para un motor de juego."""
    engine: str
    platform: str
    post_count: int
    positive_count: int
    negative_count: int
    neutral_count: int
    promotor_total: int
    detractor_total: int
    churn_risk_count: int
    high_alerts: int
    medium_alerts: int
    low_alerts: int
    nps_score: float
    sentiment_score: float


class CompetitorMetricsSummary(BaseModel):
    """Métricas de alto nivel para el grid de KPIs."""
    unity_post_count: int
    unity_nps: float
    competitor_post_count: int
    critical_alerts: int
    high_alerts: int
    total_churn_risk: int


class PlatformPulse(BaseModel):
    """Cambio de pulso por plataforma (sentimiento relativo)."""
    platform: str
    post_count: int
    positive_pct: float
    negative_pct: float
    churn_risk_pct: float
    nps: float


class AlertItem(BaseModel):
    """Alerta individual derivada de posts con alert_type alto."""
    id: int
    title: str
    summary: Optional[str]
    platform: str
    alert_type: str
    sentimental: Optional[str] = "neutral"
    churn_risk: Optional[str]
    url: Optional[str]
    date_post: Optional[str]


class RecentPostItem(BaseModel):
    """Post reciente para la sección Recent Competitor Moves."""
    id: int
    title: str
    summary: Optional[str]
    platform: str
    sentimental: Optional[str] = "neutral"
    alert_type: str
    bug: Optional[str]
    performance: Optional[str]
    url: Optional[str]
    date_post: Optional[str]


class RevenueDataPoint(BaseModel):
    """Ingresos de una empresa en un trimestre específico."""
    quarter: str
    company: str
    platform: str
    revenue_usd_millions: float
    source_type: Optional[str]


class RevenueComparisonResponse(BaseModel):
    """Comparativa de ingresos entre motores por trimestre."""
    data_points: list[RevenueDataPoint]
    quarters: list[str]


class MarketPositioningItem(BaseModel):
    """Fuerza de posicionamiento de un motor en un segmento."""
    id: int
    engine: str
    platform: str
    user_segment: str
    strength: float
    trend: str
    recorded_at: datetime

    model_config = {"from_attributes": True}


class StrategicInitiativeItem(BaseModel):
    """Iniciativa estratégica de un competidor."""
    id: int
    company: str
    platform: str
    initiative: str
    description: Optional[str]
    impact: str
    timeline: Optional[str]
    status: Optional[str] = None
    source_url: Optional[str]
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class CompetitorsDashboardResponse(BaseModel):
    """Respuesta completa del dashboard de competidores."""
    summary: CompetitorMetricsSummary
    engines: list[EngineMetric]
    pulse: list[PlatformPulse]
    critical_alerts: list[AlertItem]
    recent_posts: list[RecentPostItem]