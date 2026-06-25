"""Modelos del bounded context Metrics (METRICAS_HISTORICO).

Entidad principal:
- MetricHistory: historial de métricas. Cada fila es un snapshot de un KPI
  en un momento dado, con dimensiones flexibles en JSONB.
  Tabla append-only (solo created_at, sin updated_at).

── EJEMPLO (Paso 1 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
Este archivo completo es el ejemplo de referencia para crear un modelo ORM.
"""

from __future__ import annotations

from datetime import datetime
from decimal import Decimal
from typing import Any, Optional

from sqlalchemy import BigInteger, DateTime, Index, Numeric, String, text
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class MetricHistory(Base):
    """Historial de métricas. Append-only (sin updated_at)."""

    __tablename__ = "metric_history"
    __table_args__ = (
        Index("ix_metric_history_key_recorded", "metric_key", "recorded_at"),
        Index("ix_metric_history_dimensions_gin", "dimensions", postgresql_using="gin"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    metric_key: Mapped[str] = mapped_column(String(100), nullable=False)
    metric_name: Mapped[str] = mapped_column(String(255), nullable=False)
    value: Mapped[Decimal] = mapped_column(Numeric(18, 4), nullable=False)
    unit: Mapped[Optional[str]] = mapped_column(String(30), nullable=True)
    dimensions: Mapped[dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        server_default=text("'{}'::jsonb"),
    )
    source: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    recorded_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )


# ── FIN EJEMPLO Paso 1 ──
