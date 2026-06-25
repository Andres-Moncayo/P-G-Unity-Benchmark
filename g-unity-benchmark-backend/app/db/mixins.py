"""Mixins reutilizables para modelos SQLAlchemy.

Pensados para PostgreSQL: todos los timestamps son TIMESTAMP WITH TIME ZONE
y el default lo provee la base de datos (NOW() en UTC).
"""

from datetime import datetime

from sqlalchemy import DateTime, text
from sqlalchemy.orm import Mapped, mapped_column


class TimestampMixin:
    """Agrega created_at y updated_at gestionados por la base de datos."""

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
        onupdate=text("NOW()"),
    )
