"""Cálculo de KPIs por motor (Unity, Unreal, Godot, GMS2)."""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import case, func, select
from sqlalchemy.orm import Session

from app.modules.metrics.dashboard_kpis import (
    _quarter_filter,
    _platform_blob,
    _date_bounds,
    compute_quarter_bundle,
    last_fully_elapsed_quarter,
    prev_quarter,
)


def _platform_share_counts_by_engine(
    db: Session, start: datetime, end: datetime, engine: str
) -> tuple[int, int]:
    """Devuelve (engine_mentions, total_posts) para un motor concreto."""
    blob = _platform_blob()
    engine_expr = func.sum(case((blob.like(f"%{engine}%"), 1), else_=0))
    total = func.count()
    stmt = select(engine_expr, total).where(_quarter_filter(start, end))
    row = db.execute(stmt).one()
    return int(row[0] or 0), int(row[1] or 0)


def get_revenue_per_employee_by_engine(db: Session, engine: str) -> dict[str, Any]:
    today = datetime.utcnow().date()
    y, q = last_fully_elapsed_quarter(today)
    py, pq = prev_quarter(y, q)

    bundle = compute_quarter_bundle(
        db, year=y, quarter=q, prev_year=py, prev_quarter_n=pq
    )

    start, end = _date_bounds(y, q)
    engine_mentions, total_posts = _platform_share_counts_by_engine(
        db, start, end, engine
    )

    if engine_mentions == 0:
        return {
            "meta": {"engine": engine},
            "revenue_per_employee": {
                "value": None,
                "components": {},
                "weights_applied": True,
                "insufficient_data": True,
                "notes": [f"No hay datos para el motor '{engine}' en este trimestre."],
            },
        }

    share = engine_mentions / total_posts if total_posts else 0.0

    rpe = bundle.revenue_per_employee
    rpe["components"]["engine_share"] = round(share * 100, 2)
    rpe["notes"] = rpe.get("notes", []) + [
        f"Datos re-calculados y filtrados por engine '{engine}'."
    ]

    return {
        "meta": {"engine": engine, "quarter": f"{y}-Q{q}"},
        "revenue_per_employee": rpe,
    }
