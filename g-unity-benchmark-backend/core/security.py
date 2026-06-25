"""Utilidades de seguridad transversales: hashing, JWT y dependencies de auth.

Estas utilidades se mantienen en `core/` (no en `identity/`) porque las consume
todo el sistema (cualquier endpoint que requiera auth), no solo Identity.
El módulo identity SÍ define las reglas de negocio (validaciones, flujos);
core/security solo expone primitivas reutilizables.
"""

from __future__ import annotations

import uuid
from datetime import datetime, timedelta, timezone
from typing import Annotated

import bcrypt
import jwt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session

from core.config import settings
from core.database import get_db

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/api/v1/identity/auth/login",
    scheme_name="JWT",
)


# ── Hashing ──────────────────────────────────────────────────────────
def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(
        plain_password.encode("utf-8"),
        hashed_password.encode("utf-8"),
    )


def get_password_hash(password: str) -> str:
    if not password:
        raise ValueError("Password is required")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


# ── JWT ──────────────────────────────────────────────────────────────
def _create_token(data: dict, expires_delta: timedelta, token_type: str) -> str:
    now = datetime.now(timezone.utc)
    expire = now + expires_delta
    to_encode = data.copy()
    to_encode.update({"iat": now, "nbf": now, "exp": expire, "type": token_type})
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        data,
        expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
        "access",
    )


def create_refresh_token(data: dict, expires_delta: timedelta | None = None) -> str:
    return _create_token(
        data,
        expires_delta or timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES),
        "refresh",
    )


def _decode_token(token: str, expected_type: str) -> dict:
    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
    except jwt.ExpiredSignatureError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"{expected_type.capitalize()} token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc
    except jwt.InvalidTokenError as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Invalid {expected_type} token",
            headers={"WWW-Authenticate": "Bearer"},
        ) from exc

    if payload.get("type") != expected_type:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token type",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload


def decode_refresh_token(token: str) -> str:
    payload = _decode_token(token, "refresh")
    sub: str | None = payload.get("sub")
    if not sub:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token payload",
        )
    return sub


# Slugs que equivalen a «administrador de plataforma» (catálogo puede variar por proyecto/BD).
_PLATFORM_ADMIN_SLUGS = frozenset({"admin", "superadmin", "super_admin"})


def role_is_platform_admin(role: object | None) -> bool:
    """True si el rol ORM es administrador de plataforma.

    Acepta los slugs en `_PLATFORM_ADMIN_SLUGS` (p. ej. seed Alembic `admin`, o
    catálogos con `superadmin` / `super_admin`). No trata otros roles (p. ej.
    `analyst`, `data_analyst`) como admin.
    """
    if role is None:
        return False
    slug = getattr(role, "slug", None)
    if not isinstance(slug, str):
        return False
    normalized = slug.strip().lower().replace(" ", "_").replace("-", "_")
    return normalized in _PLATFORM_ADMIN_SLUGS


# ── Dependencies (uso desde routers) ─────────────────────────────────
def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[Session, Depends(get_db)],
):
    """Resuelve el usuario autenticado desde el JWT access token."""
    from app.modules.identity import crud  # import tardío evita ciclos

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = _decode_token(token, "access")
    user_id_str: str | None = payload.get("sub")
    if not user_id_str:
        raise credentials_exception

    try:
        user_id = uuid.UUID(str(user_id_str))
    except (ValueError, TypeError) as exc:
        raise credentials_exception from exc

    # Misma carga que el resto de Identity: eager `role` (require_admin / serialización).
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise credentials_exception
    return user


def get_current_active_user(
    current_user: Annotated["User", Depends(get_current_user)],  # type: ignore[name-defined]  # noqa: F821
):
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user",
        )
    return current_user


def require_admin(
    current_user: Annotated["User", Depends(get_current_active_user)],  # type: ignore[name-defined]  # noqa: F821
):
    """Dependency que garantiza rol admin. Úsalo con Depends() en endpoints sensibles."""
    if not role_is_platform_admin(current_user.role):
        slug = (
            getattr(current_user.role, "slug", None)
            if current_user.role is not None
            else None
        )
        allowed = ", ".join(sorted(_PLATFORM_ADMIN_SLUGS))
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Se requiere rol de plataforma (slug uno de: {allowed}). "
                f"Tu usuario: role_id={getattr(current_user, 'role_id', None)!r}, "
                f"slug efectivo={slug!r}. Tras cambiar el rol en BD, vuelve a hacer login."
            ),
        )
    return current_user
