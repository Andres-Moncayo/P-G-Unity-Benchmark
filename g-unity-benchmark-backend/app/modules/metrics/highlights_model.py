"""ORM para tablas existentes del dashboard (sin crear ni borrar tablas).

- ``"Highlights"`` — insights estratégicos (nombre con mayúscula, entre comillas en PG).
- ``Posts_Highlights`` — posts curados (tabla original).
"""

from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import ENUM as PG_ENUM
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base

HIGHLIGHTS_TABLE = "Highlights"
POSTS_HIGHLIGHTS_TABLE = "Posts_Highlights"
# Identificador SQL citado para PostgreSQL (tabla creada como "Highlights")
QUOTED_HIGHLIGHTS_TABLE = '"Highlights"'

_category_enum = PG_ENUM(
    "Robotic",
    "AI",
    "Digital twins",
    name="category_enum",
    create_type=False,
)


class Highlight(Base):
    """Insights estratégicos — tabla existente ``"Highlights"``."""

    __tablename__ = HIGHLIGHTS_TABLE
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    game_engine: Mapped[str] = mapped_column(String(100), nullable=False)
    category: Mapped[str] = mapped_column(_category_enum, nullable=False)


class PostHighlight(Base):
    """Posts destacados — tabla existente ``Posts_Highlights``."""

    __tablename__ = POSTS_HIGHLIGHTS_TABLE

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(Text, nullable=False)
    summary: Mapped[str] = mapped_column(Text, nullable=False)
    url: Mapped[str | None] = mapped_column(Text, nullable=True)
    date: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    game_engine: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[str] = mapped_column(_category_enum, nullable=False)
