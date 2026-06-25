"""Base declarativa separada para tablas de comunidad/IA en PostgreSQL.

Registra analyzed_posts y chat_conversations (estado JSON del chat y simulador).
Las tablas PgBase se crean/verifican en el evento startup de FastAPI mediante create_all.
"""
from sqlalchemy.orm import DeclarativeBase


class PgBase(DeclarativeBase):
    """Declarative base para modelos community/IA (PostgreSQL)."""
    pass
