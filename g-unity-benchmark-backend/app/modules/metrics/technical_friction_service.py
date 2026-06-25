from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

from sqlalchemy import desc, select
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost

logger = logging.getLogger(__name__)

_VALID_SEVERITIES = frozenset({"critical", "high", "medium", "low"})
_SEVERITY_RANK = {"critical": 4, "high": 3, "medium": 2, "low": 1}
_TREND_MAP = {
    "growing": "escalating",
    "declining": "improving",
    "stable": "stable",
}


def _sort_posts_by_priority(posts: list[AnalyzedPost]) -> list[AnalyzedPost]:
    return sorted(
        posts,
        key=lambda p: (
            -_SEVERITY_RANK.get(_normalize_post_severity(p), 0),
            -(p.date_post.timestamp() if p.date_post else 0),
        ),
    )


def _map_trend(raw: str | None) -> str:
    if not raw:
        return "stable"
    key = raw.lower().strip()
    return _TREND_MAP.get(key, key if key in ("escalating", "improving", "stable") else "stable")


def _impact_score(post: AnalyzedPost) -> int | None:
    if post.alert_influence_score is not None:
        return min(100, max(0, int(round(post.alert_influence_score * 100))))
    if post.churn_probability is not None:
        return min(100, max(0, int(round(post.churn_probability * 100))))
    return None


def _normalize_post_severity(post: AnalyzedPost) -> str:
    raw = (post.severity or post.alert_urgency or "low").lower().strip()
    return raw if raw in _VALID_SEVERITIES else "low"


def get_technical_friction(
    db: Session,
    engine: str = "unity",
    *,
    issues_per_category: int = 5,
    max_rows: int = 500,
) -> dict[str, Any]:
    """
    Agrupa los problemas técnicos detectados en analyzed_posts por categoría de bug.
    Filtra por motor (engine) y solo considera posts que tengan bug_category o alert_type técnico.
    """
    stmt = (
        select(AnalyzedPost)
        .where(AnalyzedPost.platform_mentioned.ilike(f"%{engine}%"))
        .where(
            (AnalyzedPost.bug_category.isnot(None))
            | (AnalyzedPost.business_category == "product")
        )
        .order_by(desc(AnalyzedPost.date_post))
        .limit(max_rows)
    )

    rows = db.execute(stmt).scalars().all()

    severity_counts = {"critical": 0, "high": 0, "medium": 0, "low": 0}
    for row in rows:
        severity_counts[_normalize_post_severity(row)] += 1

    categories_map: dict[str, list[AnalyzedPost]] = defaultdict(list)
    for row in rows:
        cat_name = row.bug_category or "General Systems"
        categories_map[cat_name].append(row)

    categories_result = []
    cat_id = 1

    for cat_name, posts in categories_map.items():
        # Calcular severidad de la categoría (la máxima entre sus posts)
        has_critical = any(
            p.severity == "critical" or p.alert_urgency == "critical" for p in posts
        )
        has_high = any(p.severity == "high" or p.alert_urgency == "high" for p in posts)
        has_medium = any(
            p.severity == "medium" or p.alert_urgency == "medium" for p in posts
        )

        cat_severity = "low"
        if has_critical:
            cat_severity = "critical"
        elif has_high:
            cat_severity = "high"
        elif has_medium:
            cat_severity = "medium"

        # Dispositivos afectados (suma de alert_reach, fallback a mock si no hay)
        total_devices = sum(p.alert_reach or 0 for p in posts)
        affected_devices_str = (
            f"{total_devices // 1000}K+" if total_devices > 1000 else str(total_devices)
        )
        if total_devices == 0:
            affected_devices_str = "10K+"  # fallback mock

        cat_issues = []
        for p in _sort_posts_by_priority(posts)[:issues_per_category]:
            p_sev = _normalize_post_severity(p)
            first_seen = (
                p.date_post.strftime("%Y-%m-%d %H:%M")
                if p.date_post
                else "2024-01-01 00:00"
            )
            issue: dict[str, Any] = {
                "id": int(p.id),
                "title": p.title or "Issue reported",
                "severity": p_sev,
                "errorCode": f"AP-{int(p.id)}",
                "impactScore": _impact_score(p),
                "status": "active",
                "trend": _map_trend(
                    str(p.industry_trend) if p.industry_trend is not None else None
                ),
                "firstSeen": first_seen,
                "description": p.summary or "User reported technical issue.",
            }
            if p.alert_reach:
                issue["devices"] = int(p.alert_reach)
            cat_issues.append(issue)

        categories_result.append(
            {
                "id": cat_id,
                "name": cat_name,
                "severity": cat_severity,
                "activeIssues": len(posts),
                "affectedDevices": affected_devices_str,
                "avgResolutionTime": "48h",  # mock value
                "issues": cat_issues,
            }
        )
        cat_id += 1

    return {
        "categories": categories_result,
        "severityCounts": severity_counts,
        "meta": {
            "data_source": "analyzed_posts",
            "engine": engine,
            "category_count": len(categories_result),
            "total_posts": len(rows),
        },
    }
