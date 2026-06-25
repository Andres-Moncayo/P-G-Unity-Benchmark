"""CRUD de Identity: solo persistencia, NUNCA reglas de negocio.

Las reglas de negocio (validar email Globant, encriptar password, decidir
rol por defecto, etc.) viven en service.py. Aquí solo SELECT/INSERT/UPDATE.
"""

from __future__ import annotations

import uuid
from datetime import datetime
from typing import Optional

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.modules.identity.models import Role, User, Log


# ── Roles ────────────────────────────────────────────────────────────
def get_role_by_slug(db: Session, slug: str) -> Optional[Role]:
    return db.execute(select(Role).where(Role.slug == slug)).scalar_one_or_none()


def list_roles(db: Session) -> list[Role]:
    return list(db.execute(select(Role).order_by(Role.id)).scalars())


# ── Users ────────────────────────────────────────────────────────────
def get_user_by_id(db: Session, user_id: uuid.UUID) -> Optional[User]:
    return db.execute(
        select(User).options(selectinload(User.role)).where(User.id == user_id)
    ).scalar_one_or_none()


def get_user_by_email(db: Session, email: str) -> Optional[User]:
    return db.execute(
        select(User).options(selectinload(User.role)).where(User.email == email)
    ).scalar_one_or_none()


def list_users(
    db: Session,
    *,
    skip: int = 0,
    limit: int = 50,
    only_active: bool = False,
) -> list[User]:
    stmt = select(User).options(selectinload(User.role))
    if only_active:
        stmt = stmt.where(User.is_active.is_(True))
    stmt = stmt.order_by(User.created_at.desc()).offset(skip).limit(limit)
    return list(db.execute(stmt).scalars())


def create_user(
    db: Session,
    *,
    email: str,
    full_name: str,
    hashed_password: str,
    role_id: Optional[int],
    is_active: bool,
    created_by_id: Optional[uuid.UUID],
) -> User:
    user = User(
        email=email,
        full_name=full_name,
        hashed_password=hashed_password,
        role_id=role_id,
        is_active=is_active,
        created_by_id=created_by_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user(db: Session, user: User, **fields) -> User:
    for key, value in fields.items():
        if value is not None:
            setattr(user, key, value)
    db.commit()
    db.refresh(user)
    return user


def set_user_active(db: Session, user: User, is_active: bool) -> User:
    user.is_active = is_active
    db.commit()
    db.refresh(user)
    return user


def touch_last_login(db: Session, user: User) -> None:
    user.last_login_at = datetime.utcnow()
    db.commit()

# ── Logs (Auditoría) ─────────────────────────────────────────────────
def create_audit_log(
    db: Session,
    *,
    user_id: uuid.UUID | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    details: dict = {}
) -> None:
    """Inserta un registro append-only en la tabla de auditoría."""
    from app.modules.identity.models import Log # Importación local si hay problemas circulares
    
    log_entry = Log(
        user_id=user_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        details=details
    )
    db.add(log_entry)
    db.commit()