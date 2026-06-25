from __future__ import annotations

from collections.abc import Generator
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from sqlalchemy import create_engine, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from core.config import settings


def build_connect_args(database_url: str | None = None) -> dict[str, object]:
    """Argumentos de conexión compatibles con Neon, local y otros Postgres gestionados."""
    url = database_url or settings.DATABASE_URL
    args: dict[str, object] = {"connect_timeout": settings.DB_CONNECT_TIMEOUT}

    lower = url.lower()
    if "sslmode=require" in lower or "neon.tech" in lower or "supabase" in lower:
        args["sslmode"] = "require"

    return args


def create_app_engine(
    database_url: str | None = None,
    *,
    poolclass=None,
    **engine_kwargs,
) -> Engine:
    """Crea el engine SQLAlchemy usando la URL activa de configuración."""
    url = database_url or settings.DATABASE_URL
    return create_engine(
        url,
        pool_pre_ping=settings.DB_POOL_PRE_PING,
        pool_recycle=settings.DB_POOL_RECYCLE,
        pool_size=settings.DB_POOL_SIZE,
        max_overflow=settings.DB_MAX_OVERFLOW,
        pool_timeout=settings.DB_POOL_TIMEOUT,
        connect_args=build_connect_args(url),
        poolclass=poolclass,
        **engine_kwargs,
    )


engine = create_app_engine()

SessionLocal = sessionmaker(
    bind=engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
    expire_on_commit=False,
)


class Base(DeclarativeBase):
    """Declarative base único compartido por TODOS los modelos del proyecto.

    Cada módulo (identity, metrics, ...) define sus modelos heredando de esta clase.
    El registro centralizado vive en app/db/base.py, que importa todos los modelos
    para que Alembic los detecte en autogenerate.
    """


def get_db() -> Generator[Session, None, None]:
    """Dependency de FastAPI que entrega una sesión y la cierra al final del request."""
    db = SessionLocal()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ── PostgreSQL comunidad/IA (chat, analyzed_posts) ────────────────────
# Si POSTGRES_URL no está definido se reutiliza DATABASE_URL (misma BD).
_postgres_url = settings._normalize_database_url(
    settings.POSTGRES_URL or settings.DATABASE_URL
)

_postgres_engine = create_engine(
    _postgres_url,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    pool_recycle=settings.DB_POOL_RECYCLE,
    pool_size=settings.DB_POOL_SIZE,
    max_overflow=settings.DB_MAX_OVERFLOW,
    pool_timeout=settings.DB_POOL_TIMEOUT,
    connect_args={"connect_timeout": settings.DB_CONNECT_TIMEOUT},
)

_PostgresSession = sessionmaker(
    bind=_postgres_engine,
    autocommit=False,
    autoflush=False,
    class_=Session,
)


def get_postgres_db() -> Generator[Session, None, None]:
    """Dependency FastAPI para sesión PostgreSQL comunidad/IA."""
    db = _PostgresSession()
    try:
        yield db
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


def verify_database_connection() -> None:
    """Raise if the primary SQLAlchemy `engine` cannot execute a trivial query.

    Used at startup to detect unreachable or misconfigured DATABASE_URL.
    """
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
    except Exception:
        raise
