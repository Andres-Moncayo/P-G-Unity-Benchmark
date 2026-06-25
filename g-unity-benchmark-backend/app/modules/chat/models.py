"""Modelo ORM único para chat IA + simulador: todo el estado vive en chat_conversations.state (JSONB)."""
import uuid

from sqlalchemy import Column, DateTime, String, func, text
from sqlalchemy.dialects.postgresql import JSONB, UUID

from app.db.pg_base import PgBase


class ChatConversation(PgBase):
    __tablename__ = "chat_conversations"

    id = Column(String(36), primary_key=True, default=lambda: uuid.uuid4().hex)
    user_id = Column(UUID(as_uuid=True), nullable=False, index=True)
    title = Column(String(255), nullable=True, default="New conversation")
    created_at = Column(DateTime, nullable=False, server_default=func.now())
    updated_at = Column(DateTime, nullable=False, server_default=func.now(), onupdate=func.now())
    state = Column(JSONB, nullable=False, server_default=text("'{}'::jsonb"))