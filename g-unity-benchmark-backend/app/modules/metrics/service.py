"""Lógica de negocio de Metrics.

Orquesta las operaciones del CRUD y aplica reglas de negocio.
Los routers SOLO llaman a estas funciones.

── EJEMPLO (Paso 4 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
Este archivo completo es el ejemplo de referencia para crear un service.
"""

from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Any

from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.modules.metrics import crud
from app.modules.metrics.dashboard_cache import get_or_set_dashboard_cache
from app.modules.metrics.dashboard_kpis import build_dashboard_payload
from app.modules.metrics.models import MetricHistory
from app.modules.metrics.schemas import MetricCreate


def get_metrics(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    metric_key: str | None = None,
) -> tuple[list[MetricHistory], int]:
    """Obtener métricas paginadas con filtro opcional."""
    return crud.list_metrics(db, skip=skip, limit=limit, metric_key=metric_key)


def get_metric_detail(db: Session, metric_id: int) -> MetricHistory | None:
    """Obtener una métrica por ID."""
    return crud.get_metric_by_id(db, metric_id)


def register_metric(db: Session, payload: MetricCreate) -> MetricHistory:
    """Registrar una nueva entrada de métrica."""
    return crud.create_metric(
        db,
        metric_key=payload.metric_key,
        metric_name=payload.metric_name,
        value=Decimal(str(payload.value)),
        unit=payload.unit,
        dimensions=payload.dimensions,
        source=payload.source,
    )


def get_dashboard_kpis(
    db: Session,
    *,
    reference_date: date | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    """Agrega Opportunity Index, Market Share Shift y Revenue Per Employee (trimestre)."""
    ref = reference_date or date.today()
    cache_key = f"dashboard:kpis:{ref.isoformat()}:{quarter or 'auto'}"
    try:
        return get_or_set_dashboard_cache(
            cache_key,
            lambda: build_dashboard_payload(
                db, reference_date=ref, quarter_override=quarter
            ),
        )
    except ProgrammingError as exc:
        msg = str(exc.orig) if getattr(exc, "orig", None) else str(exc)
        if "analyzed_posts" in msg:
            raise RuntimeError(
                "La tabla analyzed_posts no existe o el esquema no coincide. "
                "Ejecute `alembic upgrade head` (revisión 005) o aplique el DDL de analyzed_posts."
            ) from exc
        raise


def get_opportunity_index_only(
    db: Session,
    *,
    reference_date: date | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    data = get_dashboard_kpis(db, reference_date=reference_date, quarter=quarter)
    return {"meta": data["meta"], "opportunity_index": data["opportunity_index"]}


def get_market_share_shift_only(
    db: Session,
    *,
    reference_date: date | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    data = get_dashboard_kpis(db, reference_date=reference_date, quarter=quarter)
    return {"meta": data["meta"], "market_share_shift": data["market_share_shift"]}


def get_revenue_per_employee_only(
    db: Session,
    *,
    reference_date: date | None = None,
    quarter: str | None = None,
) -> dict[str, Any]:
    data = get_dashboard_kpis(db, reference_date=reference_date, quarter=quarter)
    return {"meta": data["meta"], "revenue_per_employee": data["revenue_per_employee"]}


# ── FIN EJEMPLO Paso 4 ──
