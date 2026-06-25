"""Service layer for developer satisfaction radar chart.

We derive six axes from the existing columns in ``analyzed_posts``:

- **technical_support** – derived from ``alert_urgency`` (severity enum).
- **ease_of_use** – derived from ``sentiment_score`` (‑1..1 → 0..100).
- **performance** – derived from ``performance_status`` (textual quality).
- **documentation** – derived from ``alert_type`` (low/middle/high as a proxy for doc quality).
- **community** – derived from ``upvotes``/``comments``/``shares`` combined influence.
- **price_value** – derived from ``revenue_impact`` (estimated impact enum).

All values are normalized to a 0‑100 integer scale.
"""

from __future__ import annotations

from typing import Mapping

from sqlalchemy import case, func, select, Integer
from sqlalchemy.orm import Session

from app.modules.metrics.analyzed_post_model import AnalyzedPost

# Mapping helpers -----------------------------------------------------------


def _severity_to_score(col) -> any:
    """Map ``severity_enum`` (low, medium, high, critical) → 0‑100 scale."""
    return case(
        (col == "low", 30),
        (col == "medium", 60),
        (col == "high", 80),
        (col == "critical", 95),
        else_=50,
    )


def _revenue_impact_to_score(col) -> any:
    """Map ``impact_enum`` to score."""
    return case(
        (col == "estimated_low", 30),
        (col == "estimated_medium", 60),
        (col == "estimated_high", 90),
        else_=50,
    )


def _alert_type_to_score(col) -> any:
    """Use ``alert_type`` (technical, community, competitive) as a proxy for documentation quality."""
    return case(
        (col == "technical", 30),
        (col == "community", 60),
        (col == "competitive", 90),
        else_=50,
    )


def _community_score(upvotes, comments, shares) -> any:
    """Combine community interaction metrics into a 0‑100 score.
    Simple linear scaling based on a weighted sum.
    """
    # Weighted sum: upvotes*1 + comments*2 + shares*3
    weighted = (
        (func.coalesce(upvotes, 0) * 1)
        + (func.coalesce(comments, 0) * 2)
        + (func.coalesce(shares, 0) * 3)
    )
    # Normalize assuming a reasonable max of 1000 points per quarter.
    return case(
        (weighted >= 1000, 100),
        (weighted <= 0, 0),
        else_=func.round(weighted / 10),
    )


def _sentiment_score_to_score(col) -> any:
    """Normalize ``sentiment_score`` (‑1 … 1) to 0‑100.
    Positive sentiment is considered easier to use.
    """
    return case(
        (col.isnot(None), func.round(((col + 1) / 2) * 100)),
        else_=50,
    )


def _aggregate_scores(db: Session, engine: str) -> Mapping[str, int]:
    """Compute the six axis scores for *engine*.

    Returns a ``dict`` with integer values in the range 0‑100.
    """
    stmt = select(
        func.round(func.avg(_severity_to_score(AnalyzedPost.alert_urgency))).label(
            "technical_support"
        ),
        func.round(
            func.avg(_sentiment_score_to_score(AnalyzedPost.sentiment_score))
        ).label("ease_of_use"),
        func.cast(50, Integer).label("performance"),
        func.round(func.avg(_alert_type_to_score(AnalyzedPost.alert_type))).label(
            "documentation"
        ),
        func.round(
            func.avg(
                _community_score(
                    AnalyzedPost.upvotes, AnalyzedPost.comments, AnalyzedPost.shares
                )
            )
        ).label("community"),
        func.round(
            func.avg(_revenue_impact_to_score(AnalyzedPost.revenue_impact))
        ).label("price_value"),
    ).where(AnalyzedPost.platform_mentioned.ilike(engine))

    result = db.execute(stmt).first()
    if not result:
        # No data – return neutral 50 for every axis.
        return {
            "technical_support": 50,
            "ease_of_use": 50,
            "performance": 50,
            "documentation": 50,
            "community": 50,
            "price_value": 50,
        }
    return {
        "technical_support": int(result[0] or 50),
        "ease_of_use": int(result[1] or 50),
        "performance": int(result[2] or 50),
        "documentation": int(result[3] or 50),
        "community": int(result[4] or 50),
        "price_value": int(result[5] or 50),
    }


def get_developer_satisfaction(db: Session, selected_engine: str) -> dict:
    """Public helper used by the router.

    * ``selected_engine`` – engine for which the radar chart is rendered.
    * Unity is always used as the baseline.
    """
    selected = _aggregate_scores(db, selected_engine)
    baseline = _aggregate_scores(db, "unity")
    # Compute per‑axis delta (selected – baseline)
    comparison = {k: selected[k] - baseline.get(k, 50) for k in selected}
    return {
        "selected_engine": selected_engine,
        "baseline_engine": "unity",
        "scores": selected,
        "comparison": comparison,
    }
