from __future__ import annotations

from datetime import datetime
import enum
from typing import Any, Generic, List, Optional, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class SentimentLabel(str, enum.Enum):
    positive = "positive"
    negative = "negative"
    neutral = "neutral"


class Severity(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"
    critical = "critical"


class Risk(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class Impact(str, enum.Enum):
    estimated_low = "estimated_low"
    estimated_medium = "estimated_medium"
    estimated_high = "estimated_high"


class MigrationIntent(str, enum.Enum):
    none = "none"
    considering = "considering"
    migrated_from = "migrated_from"
    migrated_to = "migrated_to"


class Trend(str, enum.Enum):
    growing = "growing"
    stable = "stable"
    declining = "declining"


class Stage(str, enum.Enum):
    evaluation = "evaluation"
    implementation = "implementation"
    production = "production"


class Region(str, enum.Enum):
    na = "na"
    emea = "emea"
    apac = "apac"
    latam = "latam"


class AlertCategory(str, enum.Enum):
    technical = "technical"
    financial = "financial"
    competitive = "competitive"
    community = "community"


class BusinessCategory(str, enum.Enum):
    general = "general"
    product = "product"
    finance = "finance"
    ecosystem = "ecosystem"
    positioning = "positioning"


class PostAnalysis(BaseModel):
    id: Optional[int] = None
    title: Optional[str] = None
    summary: Optional[str] = None
    url: Optional[str] = None
    date_post: Optional[datetime] = None
    source_platform: Optional[str] = None
    source_subreddit: Optional[str] = None
    source_author: Optional[str] = None
    upvotes: int = 0
    comments: int = 0
    shares: int = 0
    sentiment_score: float = 0.0
    sentiment_label: Optional[SentimentLabel] = None
    sentiment_confidence: float = 0.0
    platform_mentioned: Optional[str] = None
    bug_category: Optional[str] = None
    severity: Optional[Severity] = None
    unity_version: Optional[str] = None
    affected_platforms: List[str] = Field(default_factory=list)
    churn_risk: Optional[Risk] = None
    churn_probability: float = 0.0
    revenue_impact: Optional[Impact] = None
    user_segment: Optional[str] = None
    competitor_mentioned: Optional[str] = None
    comparison_type: Optional[str] = None
    migration_intent: Optional[MigrationIntent] = None
    sentiment_strength: float = 0.0
    would_recommend: Optional[bool] = None
    key_factors: List[str] = Field(default_factory=list)
    industry_trend: Optional[Trend] = None
    adoption_stage: Optional[Stage] = None
    company_size: Optional[str] = None
    geographic_region: Optional[Region] = None
    alert_type: Optional[AlertCategory] = None
    alert_urgency: Optional[Severity] = None
    alert_reach: int = 0
    alert_influence_score: float = 0.0
    business_category: Optional[BusinessCategory] = None
    platform: str = "unity"

    model_config = ConfigDict(from_attributes=True)


class MiningResponse(BaseModel):
    posts: list[PostAnalysis] = Field(default_factory=list)


class CountItem(BaseModel):
    label: str
    count: int


class ChurnInsightItem(BaseModel):
    engine: str
    average_churn_probability: float
    post_count: int


class MarketSignalItem(BaseModel):
    trend: str
    count: int


class PaginatedResponse(BaseModel, Generic[T]):
    data: list[T]
    total_pages: int
    count: int
    total_count: int
    limit: int
    offset: int


class MiningStatsResponse(BaseModel):
    total_records: int
    engine_distribution: dict[str, int]
    sentiment_distribution: dict[str, int]
    top_bug_categories: list[CountItem]
    active_critical_alerts: int


class ChurnInsightResponse(BaseModel):
    items: list[ChurnInsightItem]


class MarketSignalsResponse(BaseModel):
    items: list[MarketSignalItem]
