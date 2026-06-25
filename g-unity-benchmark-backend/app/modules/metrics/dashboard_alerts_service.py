from __future__ import annotations

from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost


def get_critical_alerts(db: Session, engine: str, limit: int = 10) -> dict[str, Any]:
    """
    Obtiene las alertas críticas (alta severidad/urgencia) registradas en analyzed_posts.
    Se pueden filtrar por motor o devolver todas ('all').
    """
    # Filtramos las alertas de mayor criticidad o urgencia
    stmt = (
        select(AnalyzedPost)
        .where(
            (AnalyzedPost.alert_urgency.in_(["high", "critical"]))
            | (AnalyzedPost.severity.in_(["high", "critical"]))
        )
        .order_by(desc(AnalyzedPost.date_post))
    )

    if engine and engine.lower() != "all":
        stmt = stmt.where(AnalyzedPost.platform_mentioned.ilike(f"%{engine}%"))

    stmt = stmt.limit(limit)
    rows = db.execute(stmt).scalars().all()

    alerts = []
    for row in rows:
        alerts.append(
            {
                "id": row.id,
                "title": row.title or "Sin título",
                "summary": row.summary,
                "url": row.url,
                "date_post": row.date_post.isoformat() if row.date_post else None,
                "platform_mentioned": row.platform_mentioned,
                "severity": row.severity,
                "alert_type": row.alert_type,
                "alert_urgency": row.alert_urgency,
                "bug_category": row.bug_category,
            }
        )

    return {
        "meta": {
            "engine_filter": engine or "all",
            "limit": limit,
            "total_returned": len(alerts),
        },
        "alerts": alerts,
    }
