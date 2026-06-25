"""Service layer for Real-Time Intelligence Monitor.

Queries ``analyzed_posts`` to produce:
- **Source counts** (feeds, forums, news, reports, social) derived from ``source_platform``.
- **Alert feed** – last N posts ordered by date, enriched with category, sentiment, and tags.

All data is live from PostgreSQL – no mock/hardcoded values.
"""

from __future__ import annotations

from datetime import datetime, timedelta, date
from typing import Any

from sqlalchemy import select, desc, func
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost


# ── Quarter helpers ───────────────────────────────────────────────────


def _current_quarter_bounds() -> tuple[datetime, datetime]:
    """Return (start, end_exclusive) datetimes for the current calendar quarter."""
    today = date.today()
    q = (today.month - 1) // 3  # 0=Q1, 1=Q2, 2=Q3, 3=Q4
    start_month = q * 3 + 1  # 1, 4, 7, 10
    start = datetime(today.year, start_month, 1)
    # Next quarter start
    if start_month + 3 > 12:
        end = datetime(today.year + 1, 1, 1)
    else:
        end = datetime(today.year, start_month + 3, 1)
    return start, end


# ── Source platform → Monitor category mapping ───────────────────────

_PLATFORM_TO_SOURCE_TYPE: dict[str, str] = {
    "reddit": "forums",
    "twitter": "social",
    "x": "social",
    "linkedin": "social",
    "facebook": "social",
    "discord": "social",
    "youtube": "social",
    "gamedeveloper": "news",
    "gamedeveloper.com": "news",
    "kotaku": "news",
    "ign": "news",
    "pcgamer": "news",
    "gdc": "reports",
    "gdc report": "reports",
    "report": "reports",
    "rss": "feeds",
    "feed": "feeds",
    "blog": "feeds",
    "medium": "feeds",
    "github": "feeds",
    "forum": "forums",
    "unity_forum": "forums",
    "unreal_forum": "forums",
    "godot_forum": "forums",
    "stackoverflow": "forums",
    "stack overflow": "forums",
}


def _classify_source(source: str | None) -> str:
    """Map a source_platform string to one of: feeds, forums, news, reports, social."""
    if not source:
        return "forums"  # Default fallback
    lower = source.lower().strip()
    for keyword, category in _PLATFORM_TO_SOURCE_TYPE.items():
        if keyword in lower:
            return category
    return "forums"  # Unrecognized sources default to forums


def _business_category_label(cat: str | None) -> str:
    """Map ``business_category_enum`` to UI-friendly label."""
    mapping = {
        "product": "Producto",
        "finance": "Finanzas",
        "positioning": "Posicionamiento",
        "ecosystem": "Ecosistema",
        "general": "General",
    }
    return mapping.get(cat or "", "General")


def _humanize_time(dt: datetime | None) -> str:
    """Convert a datetime to a human-friendly relative string."""
    if dt is None:
        return "sin fecha"
    now = datetime.utcnow()
    diff = now - dt
    if diff < timedelta(minutes=1):
        return "ahora mismo"
    if diff < timedelta(hours=1):
        minutes = int(diff.total_seconds() / 60)
        return f"hace {minutes} min"
    if diff < timedelta(hours=24):
        hours = int(diff.total_seconds() / 3600)
        return f"hace {hours} h"
    if diff < timedelta(days=7):
        days = int(diff.total_seconds() / 86400)
        return f"hace {days} d"
    return dt.strftime("%d %b %Y")


def _extract_tags(post: Any) -> list[str]:
    """Build meaningful tags from post data."""
    tags: list[str] = []

    # Platform mentioned
    if post.platform_mentioned:
        tags.append(post.platform_mentioned.capitalize())

    # Competitor mentioned (if different from platform)
    if (
        post.competitor_mentioned
        and post.competitor_mentioned != post.platform_mentioned
    ):
        tags.append(post.competitor_mentioned.capitalize())

    # Business category as tag
    if post.business_category:
        label = _business_category_label(post.business_category)
        if label not in tags:
            tags.append(label)

    # Bug category
    if post.bug_category:
        tags.append(post.bug_category.replace("_", " ").title())

    # Migration intent
    if post.migration_intent and post.migration_intent != "none":
        tags.append("Migración")

    # Churn risk
    if post.churn_risk and post.churn_risk in ("high",):
        tags.append("Riesgo Alto")

    # Limit to 4 tags max for UI readability
    return tags[:4]


def _determine_source_label(post: Any) -> str:
    """Build a readable source label like 'Reddit r/gamedev' or 'GameDeveloper.com'."""
    platform = post.source_platform or "Desconocido"
    subreddit = post.source_subreddit

    if subreddit:
        # Avoid double "r/" if subreddit already starts with "r/"
        clean_sub = subreddit.lstrip("r/").lstrip("/")
        return f"Reddit r/{clean_sub}"
    return platform.replace("_", " ").title()


# Valid business categories for filtering
VALID_CATEGORIES = {
    "all": None,
    "product": "product",
    "finance": "finance",
    "positioning": "positioning",
    "ecosystem": "ecosystem",
    "general": "general",
}

# UI labels for categories (used in the response)
CATEGORY_LABELS = {
    "all": "Todos",
    "product": "Producto",
    "finance": "Finanzas",
    "positioning": "Posicionamiento",
    "ecosystem": "Ecosistema",
    "general": "General",
}


def get_realtime_monitor(
    db: Session,
    limit: int = 8,
    offset: int = 0,
    category: str = "all",
) -> dict[str, Any]:
    """Build the full payload for the Real-Time Intelligence Monitor.

    Only includes posts from the **current calendar quarter** so that
    source counts and the alert feed reflect the most recent period.

    Args:
        db: Database session.
        limit: Max alerts to return (default 8).
        offset: Rows to skip for paginated alert feed.
        category: Filter by business category ('all', 'product', 'finance',
                  'positioning', 'ecosystem', 'general').

    Returns:
        dict with keys: feeds, forums, news, reports, social, alerts,
        alerts_total, total_posts, active_filter, available_filters
    """
    q_start, q_end = _current_quarter_bounds()

    # ── 1. Count posts per source type (SQL GROUP BY, no full-table fetch) ──
    source_counts: dict[str, int] = {
        "feeds": 0,
        "forums": 0,
        "news": 0,
        "reports": 0,
        "social": 0,
    }
    platform_rows = db.execute(
        select(AnalyzedPost.source_platform, func.count())
        .where(
            AnalyzedPost.date_post >= q_start,
            AnalyzedPost.date_post < q_end,
        )
        .group_by(AnalyzedPost.source_platform)
    ).all()
    for platform, count in platform_rows:
        source_counts[_classify_source(platform)] += int(count or 0)

    # ── 2. Fetch paginated posts as alerts (current quarter, filtered) ─
    cat_key = category.lower().strip()
    db_category = VALID_CATEGORIES.get(cat_key)
    filters = [
        AnalyzedPost.date_post >= q_start,
        AnalyzedPost.date_post < q_end,
    ]
    if db_category is not None:
        filters.append(AnalyzedPost.business_category == db_category)

    alerts_total = (
        db.execute(select(func.count()).select_from(AnalyzedPost).where(*filters)).scalar()
        or 0
    )

    posts = (
        db.execute(
            select(AnalyzedPost)
            .where(*filters)
            .order_by(desc(AnalyzedPost.date_post))
            .offset(offset)
            .limit(limit)
        )
        .scalars()
        .all()
    )

    alerts: list[dict[str, Any]] = []
    for post in posts:
        sentiment_label = post.sentiment_label or "neutral"
        sentiment = "positive" if sentiment_label == "positive" else "negative"

        # Determine if the post is "live" (within last 30 min)
        is_live = False
        if post.date_post:
            diff = datetime.utcnow() - post.date_post
            is_live = diff < timedelta(minutes=30)

        alerts.append(
            {
                "id": post.id,
                "source": _determine_source_label(post),
                "time": _humanize_time(post.date_post),
                "category": _business_category_label(post.business_category),
                "sentiment": sentiment,
                "title": post.title or post.summary or "Sin título",
                "tags": _extract_tags(post),
                "live": is_live,
            }
        )

    return {
        "feeds": source_counts["feeds"],
        "forums": source_counts["forums"],
        "news": source_counts["news"],
        "reports": source_counts["reports"],
        "social": source_counts["social"],
        "total_posts": sum(source_counts.values()),
        "alerts_total": alerts_total,
        "active_filter": CATEGORY_LABELS.get(cat_key, "Todos"),
        "available_filters": list(CATEGORY_LABELS.values()),
        "alerts": alerts,
    }
