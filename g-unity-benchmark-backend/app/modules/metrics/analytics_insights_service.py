"""Analytics Insights for the Dashboard card.

Derives strategic insights from ``analyzed_posts`` without schema changes.
"""

from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import desc, or_, select
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost

_CATEGORY_LABELS: dict[str, str] = {
    "product": "Product Quality",
    "finance": "Customer Retention",
    "positioning": "Market Position",
    "ecosystem": "Ecosystem",
    "general": "General",
}

_SEVERITY_FLOOR: dict[str, int] = {
    "critical": 80,
    "high": 60,
    "medium": 40,
    "low": 20,
}

_TREND_MAP: dict[str, str] = {
    "growing": "up",
    "declining": "down",
    "stable": "stable",
}

_VALID_SEVERITIES = frozenset({"critical", "high", "medium", "low"})
_VALID_CATEGORIES = frozenset(_CATEGORY_LABELS.keys())


def _business_category_label(cat: str | None) -> str:
    return _CATEGORY_LABELS.get(cat or "", "General")


def _effective_severity(post: AnalyzedPost) -> str:
    raw = (post.severity or post.alert_urgency or "medium").lower()
    if raw in _VALID_SEVERITIES:
        return raw
    return "medium"


def _compute_impact(post: AnalyzedPost, severity: str) -> int:
    base = int(round((post.alert_influence_score or 0) * 100))
    floor = _SEVERITY_FLOOR.get(severity, 40)
    return min(100, max(floor, base))


def _compute_trend(post: AnalyzedPost) -> str:
    if post.industry_trend:
        return _TREND_MAP.get(post.industry_trend, "stable")
    return "stable"


def _compute_confidence(post: AnalyzedPost) -> int:
    raw = post.sentiment_confidence if post.sentiment_confidence is not None else 0.85
    return min(100, max(0, int(round(raw * 100))))


def _build_recommendation(post: AnalyzedPost, severity: str) -> str:
    cat = post.business_category or "general"
    churn = post.churn_risk or ""
    migration = post.migration_intent or ""

    if severity == "critical" and cat == "finance":
        return (
            "Revisar pricing y estructura de runtime fee de inmediato; "
            "comunicar cambios proactivamente a cuentas en riesgo."
        )
    if severity == "critical" and cat == "product":
        return (
            "Desplegar equipo dedicado para estabilizar el área afectada; "
            "priorizar hotfix y comunicación transparente a desarrolladores."
        )
    if severity == "critical" and cat == "positioning":
        return (
            "Activar respuesta competitiva: benchmark frente a rivales y "
            "plan de retención para segmentos en fuga."
        )
    if severity in ("critical", "high") and migration in (
        "considering",
        "migrated_from",
    ):
        return (
            "Lanzar oferta de retención para estudios indie/educational; "
            "evaluar Unity Lite o tier sin royalties frente a Godot/Unreal."
        )
    if churn == "high":
        return (
            "Segmentar cuentas de alto riesgo de churn; "
            "asignar CSM y revisar contratos Pro/Enterprise."
        )
    if cat == "positioning":
        return (
            "Desarrollar oferta competitiva para el segmento afectado; "
            "reforzar diferenciadores frente a motores open-source."
        )
    if cat == "product":
        return (
            "Priorizar roadmap en la categoría técnica señalada; "
            "publicar ETA y workaround en documentación oficial."
        )
    if cat == "finance":
        return (
            "Validar impacto en ingresos con finanzas; "
            "ajustar messaging de pricing si aplica."
        )
    if cat == "ecosystem":
        return (
            "Fortalecer partnerships y Asset Store; "
            "monitorear sentimiento de comunidad en foros clave."
        )
    return (
        "Monitorear evolución del indicador; "
        "incorporar señal en el próximo comité de inteligencia competitiva."
    )


def _format_last_updated(dt: datetime | None) -> str:
    if dt is None:
        return datetime.utcnow().strftime("%Y-%m-%d %H:%M")
    return dt.strftime("%Y-%m-%d %H:%M")


def _title_and_description(post: AnalyzedPost) -> tuple[str, str]:
    title = (post.title or "").strip()
    summary = (post.summary or "").strip()
    if not title and summary:
        title = summary[:120] + ("…" if len(summary) > 120 else "")
    if not title:
        title = "Insight sin título"
    description = summary or title
    return title, description


def _map_post_to_insight(post: AnalyzedPost) -> dict[str, Any]:
    severity = _effective_severity(post)
    title, description = _title_and_description(post)
    return {
        "id": post.id,
        "title": title,
        "description": description,
        "severity": severity,
        "category": _business_category_label(post.business_category),
        "impact": _compute_impact(post, severity),
        "trend": _compute_trend(post),
        "confidence": _compute_confidence(post),
        "recommendation": _build_recommendation(post, severity),
        "lastUpdated": _format_last_updated(post.date_post),
    }


def get_analytics_insights(
    db: Session,
    *,
    limit: int = 12,
    severity: str | None = None,
    category: str | None = None,
) -> dict[str, Any]:
    """Build Analytics Insights payload from analyzed_posts."""
    stmt = (
        select(AnalyzedPost)
        .where(
            or_(
                AnalyzedPost.severity.in_(["high", "critical"]),
                AnalyzedPost.alert_urgency.in_(["high", "critical"]),
            )
        )
        .order_by(
            desc(AnalyzedPost.alert_influence_score),
            desc(AnalyzedPost.date_post),
        )
    )

    if severity and severity.lower() in _VALID_SEVERITIES:
        sev = severity.lower()
        stmt = stmt.where(
            or_(
                AnalyzedPost.severity == sev,
                AnalyzedPost.alert_urgency == sev,
            )
        )

    if category and category.lower() in _VALID_CATEGORIES:
        stmt = stmt.where(AnalyzedPost.business_category == category.lower())

    stmt = stmt.limit(limit)
    rows = db.execute(stmt).scalars().all()

    if not rows:
        stmt_fallback = (
            select(AnalyzedPost)
            .order_by(
                desc(AnalyzedPost.alert_influence_score),
                desc(AnalyzedPost.date_post),
            )
            .limit(limit)
        )
        if category and category.lower() in _VALID_CATEGORIES:
            stmt_fallback = stmt_fallback.where(
                AnalyzedPost.business_category == category.lower()
            )
        rows = db.execute(stmt_fallback).scalars().all()

    insights = [_map_post_to_insight(post) for post in rows]

    return {
        "meta": {
            "limit": limit,
            "total_returned": len(insights),
            "severity_filter": severity,
            "category_filter": category,
        },
        "insights": insights,
    }
