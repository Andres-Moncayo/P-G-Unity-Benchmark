"""Lógica de negocio de Identity.

Aquí viven:
- Reglas: dominios permitidos, asignación de rol, hash de password.
- Orquestación: login (verifica + emite tokens + actualiza last_login).
- Operaciones admin: crear usuario, activar/desactivar.

Los routers SOLO llaman a estas funciones. Nunca consultan la BD directamente.
"""

from __future__ import annotations

import uuid

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.modules.identity import crud
from app.modules.identity.models import User
from app.modules.identity.schemas import UserCreate, UserUpdate
from core.security import (
    create_access_token,
    create_refresh_token,
    decode_refresh_token,
    get_password_hash,
    verify_password,
)


# ── Reglas internas ──────────────────────────────────────────────────
def _resolve_role_id(db: Session, role_slug: str) -> int:
    role = crud.get_role_by_slug(db, role_slug)
    if role is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Role '{role_slug}' no existe.",
        )
    return role.id


# ── Casos de uso ─────────────────────────────────────────────────────
def authenticate(db: Session, *, email: str, password: str) -> dict:
    """Verifica credenciales y emite tokens. Actualiza last_login_at."""
    user = crud.get_user_by_email(db, email=email)
    if user is None or not verify_password(password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Credenciales inválidas",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Usuario inactivo. Contacta al administrador.",
        )

    crud.touch_last_login(db, user)

    crud.create_audit_log(
        db,
        user_id=user.id,
        action="LOGIN_SUCCESS",
        entity_type="auth",
        details={"email": user.email}
    )

    token_payload = {"sub": str(user.id), "email": user.email}
    return {
        "access_token": create_access_token(token_payload),
        "refresh_token": create_refresh_token(token_payload),
        "token_type": "bearer",
        "user": user,
    }


def refresh_tokens(db: Session, refresh_token: str) -> dict:
    """Decodifica refresh y emite nuevos tokens."""
    user_id_str = decode_refresh_token(refresh_token)
    try:
        user_id = uuid.UUID(user_id_str)
    except (ValueError, TypeError) as exc:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token inválido",
        ) from exc

    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Usuario no encontrado"
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN, detail="Usuario inactivo"
        )

    token_payload = {"sub": str(user.id), "email": user.email}
    return {
        "access_token": create_access_token(token_payload),
        "refresh_token": create_refresh_token(token_payload),
        "token_type": "bearer",
        "user": user,
    }


def admin_create_user(
    db: Session,
    *,
    payload: UserCreate,
    actor: User,
) -> User:
    """Solo Admin puede crear usuarios."""
    if crud.get_user_by_email(db, email=str(payload.email)) is not None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Ya existe un usuario con ese email.",
        )

    role_id = _resolve_role_id(db, payload.role_slug)
    hashed = get_password_hash(payload.password)

    new_user = crud.create_user(
        db,
        email=str(payload.email),
        full_name=payload.full_name,
        hashed_password=hashed,
        role_id=role_id,
        is_active=payload.is_active,
        created_by_id=actor.id,
    )

    crud.create_audit_log(
        db,
        user_id=actor.id, # actor.id es el UUID del Admin que está creando la cuenta
        action="USER_CREATED",
        entity_type="user",
        entity_id=str(new_user.id),
        details={
            "created_email": new_user.email, 
            "assigned_role": payload.role_slug
        }
    )

    return new_user


def admin_update_user(
    db: Session,
    *,
    user_id: uuid.UUID,
    payload: UserUpdate,
) -> User:
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )

    fields: dict = {}
    if payload.full_name is not None:
        fields["full_name"] = payload.full_name
    if payload.is_active is not None:
        fields["is_active"] = payload.is_active
    if payload.role_slug is not None:
        fields["role_id"] = _resolve_role_id(db, payload.role_slug)

    return crud.update_user(db, user, **fields)


def admin_set_active(db: Session, *, user_id: uuid.UUID, is_active: bool) -> User:
    user = crud.get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Usuario no encontrado"
        )
    return crud.set_user_active(db, user, is_active)
