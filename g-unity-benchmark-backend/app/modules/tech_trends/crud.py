from __future__ import annotations

from collections import defaultdict
from typing import Iterable

from sqlalchemy import and_, func, select
from sqlalchemy.orm import Session

from app.modules.tech_trends.models import Highlight, PostHighlight
from app.modules.tech_trends.schemas import Highlight as HighlightSchema
from app.modules.tech_trends.schemas import PostHighlight as PostHighlightSchema
from app.modules.tech_trends.schemas import TechCategory


def save_post_highlight(db: Session, post: PostHighlightSchema) -> PostHighlight:
    if post.url:
        existing = db.execute(select(PostHighlight).where(PostHighlight.url == post.url)).scalar_one_or_none()
        if existing is not None:
            return existing

    payload = post.model_dump(mode="json")
    payload.pop("id", None)
    record = PostHighlight(**payload)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def save_highlight(db: Session, highlight: HighlightSchema) -> Highlight:
    conditions = []
    if highlight.title:
        conditions.append(Highlight.title == highlight.title)
    if highlight.category is not None:
        conditions.append(Highlight.category == highlight.category)
    if highlight.game_engine:
        conditions.append(Highlight.game_engine == highlight.game_engine)

    existing = None
    if conditions:
        existing = db.execute(select(Highlight).where(and_(*conditions))).scalar_one_or_none()
    if existing is not None:
        return existing

    payload = highlight.model_dump(mode="json")
    payload.pop("id", None)
    record = Highlight(**payload)
    db.add(record)
    db.commit()
    db.refresh(record)
    return record


def get_post_highlights(
    db: Session,
    *,
    category: TechCategory | None = None,
    game_engine: str | None = None,
    limit: int = 500,
    offset: int = 0,
) -> tuple[list[PostHighlight], int]:
    statement = select(PostHighlight).order_by(PostHighlight.id.desc())
    count_statement = select(func.count(PostHighlight.id))

    if category is not None:
        statement = statement.where(PostHighlight.category == category)
        count_statement = count_statement.where(PostHighlight.category == category)
    if game_engine:
        statement = statement.where(PostHighlight.game_engine == game_engine)
        count_statement = count_statement.where(PostHighlight.game_engine == game_engine)

    total_count = db.execute(count_statement).scalar_one()
    items = db.execute(statement.offset(offset).limit(limit)).scalars().all()
    return items, int(total_count)


def get_highlights(
    db: Session,
    *,
    category: TechCategory | None = None,
    game_engine: str | None = None,
    limit: int = 200,
    offset: int = 0,
) -> tuple[list[Highlight], int]:
    statement = select(Highlight).order_by(Highlight.id.desc())
    count_statement = select(func.count(Highlight.id))

    if category is not None:
        statement = statement.where(Highlight.category == category)
        count_statement = count_statement.where(Highlight.category == category)
    if game_engine:
        statement = statement.where(Highlight.game_engine == game_engine)
        count_statement = count_statement.where(Highlight.game_engine == game_engine)

    total_count = db.execute(count_statement).scalar_one()
    items = db.execute(statement.offset(offset).limit(limit)).scalars().all()
    return items, int(total_count)


def group_posts_by_engine_and_category(posts: Iterable[PostHighlight]) -> dict[tuple[str | None, TechCategory | None], list[PostHighlight]]:
    grouped: dict[tuple[str | None, TechCategory | None], list[PostHighlight]] = defaultdict(list)
    for post in posts:
        grouped[(post.game_engine, post.category)].append(post)
    return dict(grouped)
