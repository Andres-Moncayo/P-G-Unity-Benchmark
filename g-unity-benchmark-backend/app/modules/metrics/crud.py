"""CRUD de Metrics: solo persistencia, NUNCA reglas de negocio.

Cada función recibe `db: Session` como primer argumento.
Retorna modelos ORM o listas de ellos.

── EJEMPLO (Paso 3 de la guía ENDPOINT_IMPLEMENTATION_GUIDE.md) ──
Este archivo completo es el ejemplo de referencia para crear un CRUD.
"""

from __future__ import annotations

from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.modules.metrics.models import MetricHistory


def list_metrics(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    metric_key: str | None = None,
) -> tuple[list[MetricHistory], int]:
    """Listar métricas con paginación y filtro opcional por key.

    Returns:
        Tupla (items, total_count) para paginación.
    """
    stmt = select(MetricHistory)

    if metric_key:
        stmt = stmt.where(MetricHistory.metric_key == metric_key)

    # Total count para paginación
    count_stmt = select(func.count()).select_from(stmt.subquery())
    total = db.execute(count_stmt).scalar_one()

    # Items paginados
    stmt = stmt.order_by(MetricHistory.recorded_at.desc()).offset(skip).limit(limit)
    items = list(db.execute(stmt).scalars())

    return items, total


def get_metric_by_id(db: Session, metric_id: int) -> MetricHistory | None:
    """Obtener una métrica por su ID."""
    return db.get(MetricHistory, metric_id)


def create_metric(
    db: Session,
    *,
    metric_key: str,
    metric_name: str,
    value: Decimal,
    unit: str | None,
    dimensions: dict,
    source: str | None,
) -> MetricHistory:
    """Insertar una nueva entrada en el historial de métricas."""
    metric = MetricHistory(
        metric_key=metric_key,
        metric_name=metric_name,
        value=value,
        unit=unit,
        dimensions=dimensions,
        source=source,
    )
    db.add(metric)
    db.commit()
    db.refresh(metric)
    return metric


# ── FIN EJEMPLO Paso 3 ──
