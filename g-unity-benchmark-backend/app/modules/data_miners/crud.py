from __future__ import annotations

from datetime import date as date_type
from typing import Any

from sqlalchemy import String, cast, func, or_, select
from sqlalchemy.orm import Session

from app.modules.data_miners.models import AnalyzedPost
from app.modules.data_miners.schemas import (
    ChurnInsightItem,
    MarketSignalItem,
    MiningStatsResponse,
    PostAnalysis,
    CountItem,
    Severity,
)


def _build_fallback_title(post: PostAnalysis) -> str:
    if post.summary:
        words = post.summary.strip().split()
        if words:
            return " ".join(words[:10]).strip()

    if post.url:
        return post.url.strip()

    return "Untitled post"


def _apply_common_filters(
    statement,
    *,
    platform_mentioned: str | None = None,
    source_platform: str | None = None,
    sentiment_label: str | None = None,
    business_category: str | None = None,
    alert_urgency: str | None = None,
    q: str | None = None,
    search_date: date_type | None = None,
):
    conditions = []

    if platform_mentioned:
        conditions.append(AnalyzedPost.platform_mentioned == platform_mentioned)
    if source_platform:
        conditions.append(AnalyzedPost.source_platform == source_platform)
    if sentiment_label:
        conditions.append(AnalyzedPost.sentiment_label == sentiment_label)
    if business_category:
        conditions.append(AnalyzedPost.business_category == business_category)
    if alert_urgency:
        conditions.append(AnalyzedPost.alert_urgency == alert_urgency)
    if q:
        like_pattern = f"%{q.strip()}%"
        conditions.append(or_(AnalyzedPost.title.ilike(like_pattern), AnalyzedPost.summary.ilike(like_pattern)))
    if search_date:
        conditions.append(func.date(AnalyzedPost.date_post) == search_date)

    if conditions:
        statement = statement.where(*conditions)
    return statement


def save_analyzed_post(db: Session, post: PostAnalysis) -> AnalyzedPost:
    if post.url:
        existing = db.execute(select(AnalyzedPost).where(AnalyzedPost.url == post.url)).scalar_one_or_none()
        if existing is not None:
            incoming_title = (post.title or "").strip()
            if incoming_title and not (existing.title or "").strip():
                existing.title = incoming_title
                db.add(existing)
                db.commit()
                db.refresh(existing)
            return existing

    payload = post.model_dump(mode="json")
    payload.pop("id", None)
    payload.pop("platform", None)  
    payload["title"] = (payload.get("title") or "").strip() or _build_fallback_title(post)
    
    record = AnalyzedPost(**payload)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_mined_posts_advanced(
    db: Session,
    *,
    limit: int = 50,
    offset: int = 0,
    platform_mentioned: str | None = None,
    source_platform: str | None = None,
    sentiment_label: str | None = None,
    business_category: str | None = None,
    alert_urgency: str | None = None,
) -> tuple[list[AnalyzedPost], int]:
    base_statement = select(AnalyzedPost).order_by(AnalyzedPost.id.desc())
    base_statement = _apply_common_filters(
        base_statement,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
    )

    count_statement = select(func.count(AnalyzedPost.id))
    count_statement = _apply_common_filters(
        count_statement,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
    )

    total_count = db.execute(count_statement).scalar_one()
    items = db.execute(base_statement.offset(offset).limit(limit)).scalars().all()
    return items, int(total_count)


def search_mined_posts(
    db: Session,
    *,
    q: str | None = None,
    search_date: date_type | None = None,
    limit: int = 50,
    offset: int = 0,
    platform_mentioned: str | None = None,
    source_platform: str | None = None,
    sentiment_label: str | None = None,
    business_category: str | None = None,
    alert_urgency: str | None = None,
) -> tuple[list[AnalyzedPost], int]:
    base_statement = select(AnalyzedPost).order_by(AnalyzedPost.id.desc())
    base_statement = _apply_common_filters(
        base_statement,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
        q=q,
        search_date=search_date,
    )

    count_statement = select(func.count(AnalyzedPost.id))
    count_statement = _apply_common_filters(
        count_statement,
        platform_mentioned=platform_mentioned,
        source_platform=source_platform,
        sentiment_label=sentiment_label,
        business_category=business_category,
        alert_urgency=alert_urgency,
        q=q,
        search_date=search_date,
    )

    total_count = db.execute(count_statement).scalar_one()
    items = db.execute(base_statement.offset(offset).limit(limit)).scalars().all()
    return items, int(total_count)


def get_global_stats(db: Session) -> MiningStatsResponse:
    total_records = db.execute(select(func.count(AnalyzedPost.id))).scalar_one()

    engine_expr = func.coalesce(AnalyzedPost.platform_mentioned, "unknown")
    sentiment_expr = func.coalesce(cast(AnalyzedPost.sentiment_label, String), "unknown")

    engine_rows = db.execute(
        select(
            engine_expr.label("label"),
            func.count(AnalyzedPost.id).label("count"),
        ).group_by(engine_expr)
    ).all()
    engine_distribution = {str(row.label): int(row.count) for row in engine_rows}

    sentiment_rows = db.execute(
        select(
            sentiment_expr.label("label"),
            func.count(AnalyzedPost.id).label("count"),
        ).group_by(sentiment_expr)
    ).all()
    sentiment_distribution = {str(row.label): int(row.count) for row in sentiment_rows}

    bug_rows = db.execute(
        select(
            AnalyzedPost.bug_category.label("label"),
            func.count(AnalyzedPost.id).label("count"),
        )
        .where(AnalyzedPost.bug_category.isnot(None))
        .where(AnalyzedPost.bug_category != "")
        .group_by(AnalyzedPost.bug_category)
        .order_by(func.count(AnalyzedPost.id).desc())
        .limit(10)
    ).all()

    top_bug_categories = [CountItem(label=str(row.label), count=int(row.count)) for row in bug_rows]
    active_critical_alerts = db.execute(
        select(func.count(AnalyzedPost.id)).where(AnalyzedPost.alert_urgency == Severity.critical)
    ).scalar_one()

    return MiningStatsResponse(
        total_records=int(total_records),
        engine_distribution=engine_distribution,
        sentiment_distribution=sentiment_distribution,
        top_bug_categories=top_bug_categories,
        active_critical_alerts=int(active_critical_alerts),
    )


def get_churn_reports(db: Session, engine: str | None = None) -> list[ChurnInsightItem]:
    engine_expr = func.coalesce(AnalyzedPost.platform_mentioned, "unknown")
    statement = (
        select(
            engine_expr.label("engine"),
            func.avg(AnalyzedPost.churn_probability).label("average_churn_probability"),
            func.count(AnalyzedPost.id).label("post_count"),
        )
        .where(AnalyzedPost.churn_probability > 0.7)
        .group_by(engine_expr)
        .order_by(func.avg(AnalyzedPost.churn_probability).desc())
    )

    if engine:
        statement = statement.where(AnalyzedPost.platform_mentioned == engine)

    rows = db.execute(statement).all()
    return [
        ChurnInsightItem(
            engine=str(row.engine),
            average_churn_probability=float(row.average_churn_probability or 0.0),
            post_count=int(row.post_count),
        )
        for row in rows
    ]


def get_market_signals(db: Session) -> list[MarketSignalItem]:
    trend_expr = func.coalesce(cast(AnalyzedPost.industry_trend, String), "unknown")
    rows = db.execute(
        select(
            trend_expr.label("trend"),
            func.count(AnalyzedPost.id).label("count"),
        )
        .group_by(trend_expr)
        .order_by(func.count(AnalyzedPost.id).desc())
    ).all()

    return [MarketSignalItem(trend=str(row.trend), count=int(row.count)) for row in rows]
