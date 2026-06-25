"""Pydantic schemas para monitorización - Estructura compleja con nested objects."""
from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field


class SourceObject(BaseModel):
    """Información sobre la fuente del post."""
    platform: str
    subreddit: Optional[str] = None
    author: Optional[str] = None
    engagement: dict = Field(default_factory=lambda: {"upvotes": 0, "comments": 0, "shares": 0})


class SentimentObject(BaseModel):
    """Análisis de sentimiento."""
    score: float = Field(default=0.0, ge=-1, le=1)
    label: str = "neutral"  # positive/negative/neutral
    confidence: float = Field(default=0.5, ge=0, le=1)


class TechnicalAnalysis(BaseModel):
    """Análisis técnico del post."""
    bug_category: Optional[str] = None  # performance/crash/ui/api/documentation
    severity: Optional[str] = None  # low/medium/high/critical
    unity_version: Optional[str] = None
    affected_platforms: List[str] = Field(default_factory=list)


class BusinessMetrics(BaseModel):
    """Métricas de negocio."""
    churn_risk: Optional[str] = None  # low/medium/high
    churn_probability: Optional[float] = None
    revenue_impact: Optional[str] = None  # estimated_low/medium/high
    user_segment: Optional[str] = None  # indie/pro_enterprise/enterprise


class CompetitiveIntelligence(BaseModel):
    """Inteligencia competitiva."""
    competitor_mentioned: Optional[str] = None  # unreal/godot/other
    comparison_type: Optional[str] = None  # performance/cost/features/support
    migration_intent: Optional[str] = None  # none/considering/migrated_from/migrated_to


class NPSIndicators(BaseModel):
    """Indicadores de NPS."""
    sentiment_strength: Optional[float] = None  # -2 to 2
    would_recommend: Optional[bool] = None
    key_factors: List[str] = Field(default_factory=list)


class MarketSignals(BaseModel):
    """Señales de mercado."""
    industry_trend: Optional[str] = None  # growing/stable/declining
    adoption_stage: Optional[str] = None  # evaluation/implementation/production
    company_size: Optional[str] = None  # solo/1-10/11-50/51-200/200+
    geographic_region: Optional[str] = None  # na/emea/apac/latam


class AlertMetadata(BaseModel):
    """Metadatos de alertas."""
    type: Optional[str] = None  # technical/financial/competitive/community
    urgency: Optional[str] = None  # low/medium/high/critical
    reach: Optional[int] = None
    influence_score: Optional[float] = None


class MonitorizationPostDetailResponse(BaseModel):
    """Respuesta completa con estructura anidada."""
    id: str
    title: str
    summary: Optional[str] = None
    url: Optional[str] = None
    date: datetime
    source: SourceObject
    sentiment: SentimentObject
    platform_mentioned: str = "unity"
    bug: Optional[str] = None
    technical_analysis: TechnicalAnalysis
    business_metrics: BusinessMetrics
    competitive_intelligence: CompetitiveIntelligence
    nps_indicators: NPSIndicators
    market_signals: MarketSignals
    alert_metadata: AlertMetadata
    business_category: Optional[str] = None

    model_config = {"from_attributes": True}


class MonitorizationBusinessCategoryDetailResponse(BaseModel):
    """Respuesta agrupada por categoría de negocio con estructura detallada."""
    category: str
    posts: List[MonitorizationPostDetailResponse]
