"""Modelos del bounded context Market Intelligence.

Entidad principal:
- Post: contenido analizado de plataformas (Unity, competidores).
  Incluye sentimiento, bugs, performance, churn risk, NPS y metadata JSONB.
  La tabla es append-heavy con updates puntuales (tiene created_at + updated_at).
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Index,
    Integer,
    Numeric,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from app.db.mixins import TimestampMixin
from core.database import Base


class Post(Base, TimestampMixin):
    """Contenido analizado: sentimiento, bugs, performance, churn, NPS."""

    __tablename__ = "posts"
    __table_args__ = (
        Index("ix_posts_date", "date"),
        Index("ix_posts_platform", "platform"),
        Index("ix_posts_sentiment", "sentiment"),
        Index("ix_posts_alert_type", "alert_type"),
        Index("ix_posts_metadata_gin", "metadata", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(500), nullable=False)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )
    # Análisis de sentimiento: positive, negative, neutral
    sentiment: Mapped[str] = mapped_column(String(20), nullable=False)
    # Bug tracking: texto libre (ej: Bug_Crash, Bug_UI, null)
    bug: Mapped[Optional[str]] = mapped_column(String(100), nullable=True)
    # Performance: low / high
    performance: Mapped[Optional[str]] = mapped_column(String(10), nullable=True)
    # Churn
    churn_risk: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    churn_percentage: Mapped[Optional[Decimal]] = mapped_column(
        Numeric(5, 2),
        nullable=True,
    )
    # Plataforma: unity / competitor
    platform: Mapped[str] = mapped_column(String(50), nullable=False)
    # NPS
    promoter: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    detractor: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        server_default=text("0"),
    )
    # Nivel de alerta: low / middle / high
    alert_type: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default=text("'low'"),
    )
    # Metadata extensible (campos futuros sin migración)
    post_metadata: Mapped[dict[str, Any]] = mapped_column(
        "metadata",
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
