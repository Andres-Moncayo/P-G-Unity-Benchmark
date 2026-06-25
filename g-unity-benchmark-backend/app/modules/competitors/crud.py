"""CRUD del módulo Competitors.

Toda la lógica de agregación sobre analyzed_posts (PostgreSQL).
No hay reglas de negocio aquí — solo queries SQLAlchemy.
"""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import case, func
from sqlalchemy.orm import Session

from app.modules.data_miners.models import AnalyzedPost
from app.modules.data_miners.schemas import Risk, SentimentLabel, Severity
from app.modules.competitors.schemas import (
    AlertItem,
    CompetitorMetricsSummary,
    CompetitorsDashboardResponse,
    EngineMetric,
    MarketPositioningItem,
    PlatformPulse,
    RecentPostItem,
    RevenueComparisonResponse,
    StrategicInitiativeItem,
)


def _nps(promotor: int, detractor: int, total: int) -> float:
    if total == 0:
        return 0.0
    return round(((promotor - detractor) / total) * 100, 1)


def _enum_text(value) -> str | None:
    if value is None:
        return None
    return value.value if hasattr(value, "value") else value


def get_engine_metrics(db: Session) -> list[EngineMetric]:
    """Agrega métricas por plataforma desde analyzed_posts."""
    platform_key = func.lower(AnalyzedPost.platform_mentioned).label("platform_key")
    rows = (
        db.query(
            platform_key,
            func.count(AnalyzedPost.id).label("post_count"),
            func.sum(
                case((AnalyzedPost.sentiment_label == SentimentLabel.positive, 1), else_=0)
            ).label("positive_count"),
            func.sum(
                case((AnalyzedPost.sentiment_label == SentimentLabel.negative, 1), else_=0)
            ).label("negative_count"),
            func.sum(
                case((AnalyzedPost.sentiment_label == SentimentLabel.neutral, 1), else_=0)
            ).label("neutral_count"),
            func.sum(
                case((AnalyzedPost.would_recommend == True, 1), else_=0)
            ).label("promotor_total"),
            func.sum(
                case((AnalyzedPost.would_recommend == False, 1), else_=0)
            ).label("detractor_total"),
            func.sum(
                case((AnalyzedPost.churn_risk == Risk.high, 1), else_=0)
            ).label("churn_risk_count"),
            func.sum(
                case((AnalyzedPost.alert_urgency == Severity.high, 1), else_=0)
            ).label("high_alerts"),
            func.sum(
                case((AnalyzedPost.alert_urgency == Severity.medium, 1), else_=0)
            ).label("medium_alerts"),
            func.sum(
                case((AnalyzedPost.alert_urgency == Severity.low, 1), else_=0)
            ).label("low_alerts"),
        )
        .filter(AnalyzedPost.platform_mentioned.isnot(None))
        .group_by(platform_key)
        .all()
    )

    result = []
    for row in rows:
        total = row.post_count or 0
        promotor = int(row.promotor_total or 0)
        detractor = int(row.detractor_total or 0)
        positive = int(row.positive_count or 0)
        nps = _nps(promotor, detractor, total)
        sentiment_score = round((positive / total) * 100, 1) if total > 0 else 0.0

        result.append(
            EngineMetric(
                engine=(row.platform_key or "").capitalize(),
                platform=row.platform_key,
                post_count=total,
                positive_count=positive,
                negative_count=int(row.negative_count or 0),
                neutral_count=int(row.neutral_count or 0),
                promotor_total=promotor,
                detractor_total=detractor,
                churn_risk_count=int(row.churn_risk_count or 0),
                high_alerts=int(row.high_alerts or 0),
                medium_alerts=int(row.medium_alerts or 0),
                low_alerts=int(row.low_alerts or 0),
                nps_score=nps,
                sentiment_score=sentiment_score,
            )
        )
    # Exclude rows with no meaningful platform name
    return [r for r in result if r.platform]


def get_summary(
    db: Session,
    engines: list[EngineMetric],
    target_platform: str = "unity",
) -> CompetitorMetricsSummary:
    """Calculates KPI summary for the metrics grid."""
    target = next((e for e in engines if (e.platform or "").lower() == target_platform.lower()), None)
    unity_post_count = target.post_count if target else 0
    unity_nps = target.nps_score if target else 0.0

    competitors = [e for e in engines if (e.platform or "").lower() != target_platform.lower()]
    competitor_post_count = sum(e.post_count for e in competitors)

    critical_alerts = (
        db.query(func.count(AnalyzedPost.id))
        .filter(AnalyzedPost.alert_urgency == Severity.high)
        .scalar()
        or 0
    )
    high_alerts = (
        db.query(func.count(AnalyzedPost.id))
        .filter(AnalyzedPost.alert_urgency.in_([Severity.high, Severity.medium]))
        .scalar()
        or 0
    )
    total_churn = (
        db.query(func.count(AnalyzedPost.id))
        .filter(AnalyzedPost.churn_risk == Risk.high)
        .scalar()
        or 0
    )

    return CompetitorMetricsSummary(
        unity_post_count=unity_post_count,
        unity_nps=unity_nps,
        competitor_post_count=competitor_post_count,
        critical_alerts=critical_alerts,
        high_alerts=high_alerts,
        total_churn_risk=total_churn,
    )


def get_pulse(
    db: Session,
    engines: list[EngineMetric],
    target_platform: str = "unity",
) -> list[PlatformPulse]:
    """Generates competitive pulse per platform. Target platform is sorted last."""
    pulse = []
    for e in engines:
        total = e.post_count
        pos_pct = round((e.positive_count / total) * 100, 1) if total > 0 else 0.0
        neg_pct = round((e.negative_count / total) * 100, 1) if total > 0 else 0.0
        churn_pct = round((e.churn_risk_count / total) * 100, 1) if total > 0 else 0.0
        pulse.append(
            PlatformPulse(
                platform=e.platform,
                post_count=total,
                positive_pct=pos_pct,
                negative_pct=neg_pct,
                churn_risk_pct=churn_pct,
                nps=e.nps_score,
            )
        )
    # Sort competitors first, target platform last
    pulse.sort(key=lambda p: ((p.platform or "").lower() == target_platform.lower(), -p.post_count))
    return pulse


def get_critical_alerts(db: Session, limit: int = 10) -> list[AlertItem]:
    """Posts con alert_urgency=high, medium o low, ordenados por fecha descendente."""
    posts = (
        db.query(
            AnalyzedPost.id,
            AnalyzedPost.title,
            AnalyzedPost.summary,
            AnalyzedPost.platform_mentioned,
            AnalyzedPost.alert_urgency,
            AnalyzedPost.sentiment_label,
            AnalyzedPost.churn_risk,
            AnalyzedPost.url,
            AnalyzedPost.date_post,
        )
        .filter(AnalyzedPost.alert_urgency.in_([Severity.high, Severity.medium, Severity.low]))
        .filter(AnalyzedPost.platform_mentioned.isnot(None))
        .order_by(AnalyzedPost.date_post.desc())
        .limit(limit)
        .all()
    )
    return [
        AlertItem(
            id=int(p.id),
            title=p.title or "",
            summary=p.summary,
            platform=p.platform_mentioned or "",
            alert_type=_enum_text(p.alert_urgency) or "low",
            sentimental=_enum_text(p.sentiment_label) or "neutral",
            churn_risk=_enum_text(p.churn_risk),
            url=p.url,
            date_post=p.date_post.isoformat() if p.date_post else None,
        )
        for p in posts
    ]


def get_recent_posts(
    db: Session,
    limit: int = 10,
    target_platform: str = "unity",
) -> list[RecentPostItem]:
    """Latest analyzed posts from competitors (platforms other than target_platform)."""
    posts = (
        db.query(
            AnalyzedPost.id,
            AnalyzedPost.title,
            AnalyzedPost.summary,
            func.lower(AnalyzedPost.platform_mentioned).label("platform_key"),
            AnalyzedPost.alert_type,
            AnalyzedPost.sentiment_label,
            AnalyzedPost.bug_category,
            AnalyzedPost.url,
            AnalyzedPost.date_post,
        )
        .filter(func.lower(AnalyzedPost.platform_mentioned) != target_platform.lower())
        .filter(AnalyzedPost.platform_mentioned.isnot(None))
        .order_by(AnalyzedPost.date_post.desc())
        .limit(limit)
        .all()
    )
    return [
        RecentPostItem(
            id=int(p.id),
            title=p.title or "",
            summary=p.summary,
            platform=p.platform_key or "",
            sentimental=_enum_text(p.sentiment_label) or "neutral",
            alert_type=_enum_text(p.alert_type) or "community",
            bug=p.bug_category,
            performance=None,
            url=p.url,
            date_post=p.date_post.isoformat() if p.date_post else None,
        )
        for p in posts
    ]


def get_revenue_comparison(db: Session) -> RevenueComparisonResponse:
    """
    TODO: la fuente de datos financieros cambió y financial_data fue eliminado del modelo.
    Por ahora devolvemos una respuesta vacía hasta reconectar la nueva fuente.
    """
    return RevenueComparisonResponse(data_points=[], quarters=[])


def get_competitors_dashboard(
    db: Session,
    target_platform: str = "unity",
) -> CompetitorsDashboardResponse:
    """Assembles all competitors dashboard data for a given target platform."""
    try:
        engines = get_engine_metrics(db)
        summary = get_summary(db, engines, target_platform=target_platform)
        pulse = get_pulse(db, engines, target_platform=target_platform)
        critical_alerts = get_critical_alerts(db, limit=50)  # Aumentar a 50 para mostrar más datos
        recent_posts = get_recent_posts(db, target_platform=target_platform)
    except Exception as e:
        # If analyzed_posts table has schema issues, return empty dashboard
        if "column" in str(e).lower() or "platform" in str(e):
            engines = []
            summary = CompetitorMetricsSummary(
                unity_post_count=0,
                unity_nps=0.0,
                competitor_post_count=0,
                critical_alerts=0,
                high_alerts=0,
                total_churn_risk=0,
            )
            pulse = []
            critical_alerts = []
            recent_posts = []
        else:
            raise

    return CompetitorsDashboardResponse(
        summary=summary,
        engines=engines,
        pulse=pulse,
        critical_alerts=critical_alerts,
        recent_posts=recent_posts,
    )


def get_market_positioning(db: Session) -> list[MarketPositioningItem]:
    """
    Returns market positioning derived only from analyzed_posts.

    The result is aggregated by the actual platform + user_segment values stored in the DB.
    Strength is the percentage of positive posts within each group.
    Trend is derived from the computed strength without any static baseline table.
    """
    platform_key = func.lower(AnalyzedPost.platform_mentioned).label("platform_key")
    rows = (
        db.query(
            platform_key,
            AnalyzedPost.user_segment.label("user_segment"),
            func.count(AnalyzedPost.id).label("total"),
            func.sum(
                case((AnalyzedPost.sentiment_label == SentimentLabel.positive, 1), else_=0)
            ).label("positive"),
            func.max(AnalyzedPost.date_post).label("recorded_at"),
        )
        .filter(AnalyzedPost.user_segment.isnot(None))
        .filter(AnalyzedPost.platform_mentioned.isnot(None))
        .group_by(platform_key, AnalyzedPost.user_segment)
        .order_by(platform_key, AnalyzedPost.user_segment)
        .all()
    )

    result = []
    for i, row in enumerate(rows, start=1):
        total = int(row.total or 0)
        positive = int(row.positive or 0)
        strength = round((positive / total) * 100, 1) if total > 0 else 0.0
        trend = "up" if strength >= 60 else "down" if strength <= 40 else "stable"

        result.append(
            MarketPositioningItem(
                id=i,
                engine=(row.platform_key or "").title(),
                platform=row.platform_key or "",
                user_segment=row.user_segment,
                strength=strength,
                trend=trend,
                recorded_at=row.recorded_at or datetime.utcnow(),
            )
        )
    return result


# ── Strategic Initiatives — derived from analyzed_posts ───────────────────────


def get_strategic_initiatives(db: Session) -> list[StrategicInitiativeItem]:
    """
    Derives strategic initiatives from competitor analyzed_posts.

    Each high/medium/critical-urgency alert post from a non-unity platform is treated
    as a competitor strategic move. All fields come directly from analyzed_posts.
    """
    posts = (
        db.query(
            AnalyzedPost.id,
            AnalyzedPost.title,
            AnalyzedPost.summary,
            AnalyzedPost.url,
            AnalyzedPost.date_post,
            AnalyzedPost.platform_mentioned,
            AnalyzedPost.alert_urgency,
        )
        .filter(func.lower(AnalyzedPost.platform_mentioned) != "unity")
        .filter(AnalyzedPost.platform_mentioned.isnot(None))
        .filter(AnalyzedPost.alert_urgency.in_([Severity.high, Severity.medium, Severity.critical]))
        .order_by(AnalyzedPost.date_post.desc())
        .limit(30)
        .all()
    )
    return [
        StrategicInitiativeItem(
            id=p.id,
            company=(p.platform_mentioned or "").title(),
            platform=p.platform_mentioned or "",
            initiative=p.title or "",
            description=p.summary,
            impact=_enum_text(p.alert_urgency) or "medium",
            timeline=p.date_post.isoformat() if p.date_post else None,
            status=None,
            source_url=p.url,
            created_at=p.date_post or datetime.utcnow(),
            updated_at=p.date_post or datetime.utcnow(),
        )
        for p in posts
    ] 