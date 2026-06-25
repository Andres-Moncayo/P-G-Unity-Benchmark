"""DTOs Pydantic del módulo Metrics.

Contratos de API — lo que el frontend recibe y envía.
Equivalente a los Zod schemas del front.

── EJEMPLO (Paso 2 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
Este archivo completo es el ejemplo de referencia para crear schemas Pydantic.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any, Optional

from pydantic import BaseModel, ConfigDict, Field


# ── EJEMPLO Responses (GET) ──────────────────────────────────────────────────
class MetricHistoryResponse(BaseModel):
    """Una entrada del historial de métricas."""

    id: int
    metric_key: str
    metric_name: str
    value: float
    unit: Optional[str] = None
    dimensions: dict[str, Any] = {}
    source: Optional[str] = None
    recorded_at: datetime
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MetricListResponse(BaseModel):
    """Respuesta paginada de métricas."""

    items: list[MetricHistoryResponse]
    total: int
    skip: int
    limit: int


# ── EJEMPLO Requests (POST) ──────────────────────────────────────────────────
class MetricCreate(BaseModel):
    """Payload para registrar una nueva métrica."""

    metric_key: str = Field(..., min_length=1, max_length=100)
    metric_name: str = Field(..., min_length=1, max_length=255)
    value: float
    unit: Optional[str] = Field(default=None, max_length=30)
    dimensions: dict[str, Any] = Field(default_factory=dict)
    source: Optional[str] = Field(default=None, max_length=120)


# ── FIN EJEMPLO Paso 2 ──
