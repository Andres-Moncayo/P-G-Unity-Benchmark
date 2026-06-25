"""Service layer for Dashboard Highlights panel.

Lee tablas existentes (no crea ni borra tablas).
Insights estratégicos: tabla PostgreSQL ``"Highlights"`` (identificador citado).
Posts destacados: ``Posts_Highlights``.
"""

from __future__ import annotations

from typing import Any

from sqlalchemy import func, select, text
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.orm import Session

from app.modules.metrics.highlights_model import (
    HIGHLIGHTS_TABLE,
    POSTS_HIGHLIGHTS_TABLE,
    QUOTED_HIGHLIGHTS_TABLE,
    PostHighlight,
)

# Slug → DB category label
CATEGORY_FILTERS: dict[str, str | None] = {
    "all": None,
    "ai": "AI",
    "robotic": "Robotic",
    "digital_twins": "Digital twins",
}

CATEGORY_LABELS: dict[str, str] = {
    "all": "All",
    "ai": "AI",
    "robotic": "Robotic",
    "digital_twins": "Digital twins",
}


def _safe_str(value: Any, fallback: str = "—") -> str:
    if value is None:
        return fallback
    s = str(value).strip()
    return s if s else fallback


def _format_date(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "strftime"):
        return value.strftime("%d %b %Y")
    return str(value)


def _table_exists(db: Session, table_name: str) -> bool:
    """Comprueba si una tabla existe en public (sin lanzar error)."""
    row = db.execute(
        text(
            "SELECT 1 FROM information_schema.tables "
            "WHERE table_schema = 'public' AND table_name = :name LIMIT 1"
        ),
        {"name": table_name},
    ).first()
    return row is not None


def _fetch_insights(
    db: Session,
    db_category: str | None,
    limit: int,
) -> list[dict[str, Any]]:
    """Lee insights desde ``"Highlights"`` (tabla existente, SQL citado)."""
    params: dict[str, Any] = {"limit": limit}
    where = ""
    if db_category is not None:
        where = "WHERE category = :category"
        params["category"] = db_category

    rows = db.execute(
        text(
            f"SELECT id, title, content, game_engine, category "
            f"FROM {QUOTED_HIGHLIGHTS_TABLE} {where} "
            f"ORDER BY id DESC LIMIT :limit"
        ),
        params,
    ).mappings().all()

    return [
        {
            "id": row["id"],
            "title": _safe_str(row["title"], "Sin título"),
            "content": _safe_str(row["content"]),
            "game_engine": _safe_str(row["game_engine"], "General"),
            "category": _safe_str(row["category"], "General"),
        }
        for row in rows
    ]


def _count_insight_categories(db: Session) -> dict[str, int]:
    counts: dict[str, int] = {}
    try:
        for row in db.execute(
            text(
                f"SELECT category, COUNT(*) FROM {QUOTED_HIGHLIGHTS_TABLE} "
                f"GROUP BY category"
            )
        ).all():
            label = _safe_str(row[0], "General")
            counts[label] = int(row[1] or 0)
    except ProgrammingError:
        try:
            db.rollback()
        except Exception:
            pass
    return counts


def _fetch_post_highlights(
    db: Session,
    db_category: str | None,
    limit: int,
) -> tuple[list[Any], dict[str, int]]:
    """Lee Posts_Highlights si la tabla existe; si no, devuelve listas vacías."""
    if not _table_exists(db, POSTS_HIGHLIGHTS_TABLE):
        return [], {}

    post_stmt = select(PostHighlight).order_by(
        PostHighlight.date.desc().nullslast(),
        PostHighlight.id.desc(),
    )
    if db_category is not None:
        post_stmt = post_stmt.where(PostHighlight.category == db_category)

    try:
        post_rows = db.execute(post_stmt.limit(limit)).scalars().all()
        category_counts: dict[str, int] = {}
        post_category_rows = db.execute(
            select(PostHighlight.category, func.count()).group_by(
                PostHighlight.category
            )
        ).all()
        for row in post_category_rows:
            label = _safe_str(row[0], "General")
            category_counts[label] = int(row[1] or 0)
        return post_rows, category_counts
    except ProgrammingError:
        try:
            db.rollback()
        except Exception:
            pass
        return [], {}


def get_dashboard_highlights(
    db: Session,
    category: str = "all",
    limit: int = 20,
) -> dict[str, Any]:
    """Build payload for the Highlights panel on the Real-Time Monitor section."""
    cat_key = category.lower().strip()
    db_category = CATEGORY_FILTERS.get(cat_key)
    if db_category is None and cat_key != "all":
        cat_key = "all"
        db_category = None

    highlights: list[dict[str, Any]] = []
    category_counts: dict[str, int] = {}
    insights_available = _table_exists(db, HIGHLIGHTS_TABLE)

    if insights_available:
        try:
            highlights = _fetch_insights(db, db_category, limit)
            category_counts = _count_insight_categories(db)
        except ProgrammingError:
            try:
                db.rollback()
            except Exception:
                pass

    post_rows, post_category_counts = _fetch_post_highlights(db, db_category, limit)
    for label, count in post_category_counts.items():
        category_counts[label] = category_counts.get(label, 0) + count

    return {
        "active_filter": CATEGORY_LABELS.get(cat_key, "All"),
        "available_filters": list(CATEGORY_LABELS.values()),
        "category_counts": category_counts,
        "meta": {
            "highlights_table": HIGHLIGHTS_TABLE if insights_available else None,
            "post_highlights_table": POSTS_HIGHLIGHTS_TABLE
            if _table_exists(db, POSTS_HIGHLIGHTS_TABLE)
            else None,
        },
        "highlights": highlights,
        "post_highlights": [
            {
                "id": p.id,
                "title": _safe_str(p.title, "Sin título"),
                "summary": _safe_str(p.summary),
                "url": p.url,
                "date": _format_date(p.date),
                "game_engine": _safe_str(p.game_engine, "General"),
                "category": _safe_str(p.category, "General"),
            }
            for p in post_rows
        ],
    }
