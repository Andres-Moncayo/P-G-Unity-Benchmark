from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, Integer, Text
from sqlalchemy.dialects.postgresql import ENUM as PgEnum
from sqlalchemy.orm import Mapped, mapped_column

from app.db.pg_base import PgBase
from app.modules.tech_trends.schemas import TechCategory

#category_enum = PgEnum(TechCategory, name="category_enum", create_type=False)

# ── CAMBIO AQUÍ: Agregamos el validador de valores para PostgreSQL ──
category_enum = PgEnum(
    TechCategory, 
    name="category_enum", 
    create_type=False,
    values_callable=lambda x: [e.value for e in x]  # <-- ESTA ES LA MAGIA
)






class PostHighlight(PgBase):
    __tablename__ = "Posts_Highlights"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    summary: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    url: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    date: Mapped[Optional[datetime]] = mapped_column(DateTime, nullable=True)
    game_engine: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[TechCategory]] = mapped_column(category_enum, nullable=True)


class Highlight(PgBase):
    __tablename__ = "Highlights"
    __table_args__ = {"extend_existing": True}

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    title: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    game_engine: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    category: Mapped[Optional[TechCategory]] = mapped_column(category_enum, nullable=True)
