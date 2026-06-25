"""Modelo legacy para la tabla `analyzed_posts` (columnas planas).

Solo se usa si existe `analyzed_posts` y no hay tabla `posts` (entornos previos al MVP Alembic).
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, SmallInteger, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class AnalyzedPost(Base):
    __tablename__ = "analyzed_posts"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    date_post: Mapped[str | None] = mapped_column(String(20), nullable=True)
    platform: Mapped[str] = mapped_column(String(20), nullable=False)
    sentimental: Mapped[str] = mapped_column(String(20), nullable=False)
    bug: Mapped[str | None] = mapped_column(String(50), nullable=True)
    performance: Mapped[str | None] = mapped_column(String(10), nullable=True)
    churn_risk: Mapped[str | None] = mapped_column(String(20), nullable=True)
    churn_percentage: Mapped[int | None] = mapped_column(SmallInteger, nullable=True)
    promotor: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text("0"))
    detractor: Mapped[int] = mapped_column(SmallInteger, nullable=False, server_default=text("0"))
    alert_type: Mapped[str] = mapped_column(String(10), nullable=False, server_default=text("'low'"))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("CURRENT_TIMESTAMP"),
    )
