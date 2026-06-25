"""Modelos del bounded context Alerts.

Entidad principal:
- Alert: alertas asociadas a usuarios y/o posts.
  Solo created_at (sin updated_at) excepto por read_at que marca lectura.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    ForeignKey,
    Index,
    String,
    Text,
    text,
)
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from core.database import Base


class Alert(Base):
    """Alertas del sistema. No usa TimestampMixin (solo created_at, sin updated_at)."""

    __tablename__ = "alerts"
    __table_args__ = (
        Index("ix_alerts_user_unread", "user_id", "is_read"),
        Index("ix_alerts_severity", "severity", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    user_id: Mapped[Optional[uuid.UUID]] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE", onupdate="CASCADE"),
        nullable=True,
    )
    post_id: Mapped[Optional[int]] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="SET NULL", onupdate="CASCADE"),
        nullable=True,
    )
    severity: Mapped[str] = mapped_column(
        String(10),
        nullable=False,
        server_default=text("'low'"),
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_read: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        server_default=text("false"),
    )
    read_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        server_default=text("NOW()"),
    )
