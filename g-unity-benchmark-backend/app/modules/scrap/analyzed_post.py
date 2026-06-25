# app/models/analyzed_post.py
"""Modelo SQLAlchemy para posts analizados por el LLM (PostgreSQL)."""

from datetime import datetime
from typing import Optional

from sqlalchemy import Index, SmallInteger, Text
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column
from sqlalchemy.dialects.postgresql import ENUM, JSONB



class PgBase(DeclarativeBase):
    """Base separada para PostgreSQL — no mezcla con la Base de MySQL."""
    pass

# Tipos PostgreSQL ya existentes en analyzed_posts (create_type=False).
severity_enum = ENUM(
    "low", "medium", "high", "critical",
    name="severity_enum",
    create_type=False,
)
alert_category_enum = ENUM(
    "technical", "financial", "competitive", "community",
    name="alert_category_enum",
    create_type=False,
)
risk_enum = ENUM(
    "low", "medium", "high",
    name="risk_enum",
    create_type=False,
)


class AnalyzedPost(PgBase):
    __tablename__ = "analyzed_posts"
    __table_args__ = (
        Index("ix_ap_created_at", "created_at"),
        Index("ix_ap_platform",   "platform"),
        Index("ix_ap_alert_type", "alert_type"),
    )

    id:               Mapped[int]           = mapped_column(primary_key=True, autoincrement=True)
    title:            Mapped[str]           = mapped_column(Text, nullable=False)
    summary:          Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url:              Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date_post:        Mapped[Optional[str]] = mapped_column(nullable=True)
    platform:         Mapped[str]           = mapped_column(nullable=False)
    sentimental:      Mapped[str]           = mapped_column(nullable=False)
    bug:              Mapped[Optional[str]] = mapped_column(nullable=True)
    performance:      Mapped[Optional[str]] = mapped_column(nullable=True)
    churn_risk:       Mapped[Optional[str]] = mapped_column(risk_enum, nullable=True)
    churn_probability: Mapped[Optional[float]] = mapped_column(nullable=True)
    churn_percentage: Mapped[Optional[int]] = mapped_column(nullable=True)
    promotor:         Mapped[int]           = mapped_column(SmallInteger, default=0)
    detractor:        Mapped[int]           = mapped_column(SmallInteger, default=0)
    alert_type:       Mapped[str]           = mapped_column(alert_category_enum, nullable=False)
    alert_urgency:    Mapped[Optional[str]] = mapped_column(severity_enum, nullable=True)
    segment:          Mapped[Optional[str]] = mapped_column(nullable=True)
    # Datos financieros extraídos por el LLM (revenue, quarter, fuente)
    financial_data:   Mapped[Optional[dict]] = mapped_column(JSONB, nullable=True)
    created_at:       Mapped[datetime]      = mapped_column(default=datetime.utcnow)
