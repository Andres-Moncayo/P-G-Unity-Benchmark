from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import Boolean, DateTime, Float, Integer, String, Text
from sqlalchemy.dialects.postgresql import ARRAY, ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.pg_base import PgBase
from app.modules.data_miners.schemas import (
    AlertCategory,
    BusinessCategory,
    Impact,
    MigrationIntent,
    Region,
    Risk,
    SentimentLabel,
    Severity,
    Stage,
    Trend,
)

sentiment_label_enum = PgEnum(SentimentLabel, name="sentiment_label_enum", create_type=False)
severity_enum = PgEnum(Severity, name="severity_enum", create_type=False)
risk_enum = PgEnum(Risk, name="risk_enum", create_type=False)
impact_enum = PgEnum(Impact, name="impact_enum", create_type=False)
migration_enum = PgEnum(MigrationIntent, name="migration_enum", create_type=False)
trend_enum = PgEnum(Trend, name="trend_enum", create_type=False)
stage_enum = PgEnum(Stage, name="stage_enum", create_type=False)
region_enum = PgEnum(Region, name="region_enum", create_type=False)
alert_category_enum = PgEnum(AlertCategory, name="alert_category_enum", create_type=False)
business_category_enum = PgEnum(BusinessCategory, name="business_category_enum", create_type=False)


class AnalyzedPost(PgBase):
    __tablename__ = "analyzed_posts"
    __table_args__ = {'extend_existing': True}  # <-- AÑADE ESTA LÍNEA AQUÍ

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_post: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    source_platform: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_subreddit: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    source_author: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    upvotes: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    comments: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    shares: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    sentiment_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    sentiment_label: Mapped[Optional[SentimentLabel]] = mapped_column(sentiment_label_enum, nullable=True)
    sentiment_confidence: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    platform_mentioned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    bug_category: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    severity: Mapped[Optional[Severity]] = mapped_column(severity_enum, nullable=True)
    unity_version: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    affected_platforms: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)
    churn_risk: Mapped[Optional[Risk]] = mapped_column(risk_enum, nullable=True)
    churn_probability: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    revenue_impact: Mapped[Optional[Impact]] = mapped_column(impact_enum, nullable=True)
    user_segment: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    competitor_mentioned: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    comparison_type: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    migration_intent: Mapped[Optional[MigrationIntent]] = mapped_column(migration_enum, nullable=True)
    sentiment_strength: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    would_recommend: Mapped[Optional[bool]] = mapped_column(Boolean, nullable=True)
    key_factors: Mapped[list[str]] = mapped_column(ARRAY(String), nullable=True, default=list)
    industry_trend: Mapped[Optional[Trend]] = mapped_column(trend_enum, nullable=True)
    adoption_stage: Mapped[Optional[Stage]] = mapped_column(stage_enum, nullable=True)
    company_size: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    geographic_region: Mapped[Optional[Region]] = mapped_column(region_enum, nullable=True)
    alert_type: Mapped[Optional[AlertCategory]] = mapped_column(alert_category_enum, nullable=True)
    alert_urgency: Mapped[Optional[Severity]] = mapped_column(severity_enum, nullable=True)
    alert_reach: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    alert_influence_score: Mapped[Optional[float]] = mapped_column(Float, nullable=True)
    business_category: Mapped[Optional[BusinessCategory]] = mapped_column(business_category_enum, nullable=True)
