"""Resumen KPI: delegado en agregaciones sobre `posts`."""
from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.analytics.posts_aggregate import build_analytics_summary_from_posts


def build_analytics_summary(db: Session, business: str | None = None) -> list[dict]:
    return build_analytics_summary_from_posts(db, business=business)
