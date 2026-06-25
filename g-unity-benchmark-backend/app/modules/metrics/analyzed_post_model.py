"""ORM para `analyzed_posts` (inteligencia de posts analizados con enums PostgreSQL).

La migración `005_analyzed_posts` crea tipos y tabla alineados al DDL de negocio.
"""

from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import BigInteger, Boolean, DateTime, Float, Integer, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM as PG_ENUM
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

_sentiment = PG_ENUM(
    "positive",
    "negative",
    "neutral",
    name="sentiment_label_enum",
    create_type=False,
)
_severity = PG_ENUM(
    "low",
    "medium",
    "high",
    "critical",
    name="severity_enum",
    create_type=False,
)
_risk = PG_ENUM(
    "low",
    "medium",
    "high",
    name="risk_enum",
    create_type=False,
)
_impact = PG_ENUM(
    "estimated_low",
    "estimated_medium",
    "estimated_high",
    name="impact_enum",
    create_type=False,
)
_migration = PG_ENUM(
    "none",
    "considering",
    "migrated_from",
    "migrated_to",
    name="migration_enum",
    create_type=False,
)
_trend = PG_ENUM(
    "growing",
    "stable",
    "declining",
    name="trend_enum",
    create_type=False,
)
_stage = PG_ENUM(
    "evaluation",
    "implementation",
    "production",
    name="stage_enum",
    create_type=False,
)
_region = PG_ENUM(
    "na",
    "emea",
    "apac",
    "latam",
    name="region_enum",
    create_type=False,
)
_alert_cat = PG_ENUM(
    "technical",
    "financial",
    "competitive",
    "community",
    name="alert_category_enum",
    create_type=False,
)
_business_cat = PG_ENUM(
    "general",
    "product",
    "finance",
    "ecosystem",
    "positioning",
    name="business_category_enum",
    create_type=False,
)


class AnalyzedPost(Base):
    """Fila de análisis de post (tabla `analyzed_posts`)."""

    __tablename__ = "analyzed_posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_post: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=False), nullable=True
    )

    source_platform: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_subreddit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_author: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    upvotes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    comments: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shares: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)

    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[Optional[str]] = mapped_column(_sentiment, nullable=True)
    sentiment_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    platform_mentioned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bug_category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[Optional[str]] = mapped_column(_severity, nullable=True)
    unity_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    affected_platforms: Mapped[Optional[list[str]]] = mapped_column(
        ARRAY(Text), nullable=True
    )

    churn_risk: Mapped[Optional[str]] = mapped_column(_risk, nullable=True)
    churn_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    revenue_impact: Mapped[Optional[str]] = mapped_column(_impact, nullable=True)
    user_segment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    competitor_mentioned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    comparison_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    migration_intent: Mapped[Optional[str]] = mapped_column(_migration, nullable=True)

    sentiment_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    would_recommend: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    key_factors: Mapped[Optional[list[str]]] = mapped_column(ARRAY(Text), nullable=True)

    industry_trend: Mapped[Optional[str]] = mapped_column(_trend, nullable=True)
    adoption_stage: Mapped[Optional[str]] = mapped_column(_stage, nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    geographic_region: Mapped[Optional[str]] = mapped_column(_region, nullable=True)

    alert_type: Mapped[Optional[str]] = mapped_column(_alert_cat, nullable=True)
    alert_urgency: Mapped[Optional[str]] = mapped_column(_severity, nullable=True)
    alert_reach: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alert_influence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)

    business_category: Mapped[Optional[str]] = mapped_column(
        _business_cat, nullable=True
    )
