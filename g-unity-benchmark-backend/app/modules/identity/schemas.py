"""Schemas Pydantic del módulo Identity (DTOs públicos)."""

from __future__ import annotations

import re
import uuid
from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator

from core.config import settings


# ── Tokens ───────────────────────────────────────────────────────────
class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class RefreshRequest(BaseModel):
    refresh_token: str


# ── Roles ────────────────────────────────────────────────────────────
class RoleResponse(BaseModel):
    id: int
    name: str
    slug: str
    description: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ── Users ────────────────────────────────────────────────────────────
def _validate_password_strength(value: str) -> str:
    if not value or not value.strip():
        raise ValueError("La contraseña no puede estar vacía.")
    if len(value) < 8:
        raise ValueError("La contraseña debe tener al menos 8 caracteres.")
    if len(value) > 255:
        raise ValueError("La contraseña no puede exceder 255 caracteres.")
    if not re.search(r"\d", value):
        raise ValueError("La contraseña debe contener al menos un número.")
    if not re.search(r"[a-zA-Z]", value):
        raise ValueError("La contraseña debe contener al menos una letra.")
    return value


def _validate_email_domain(email: str) -> str:
    """Si ALLOWED_EMAIL_DOMAINS está configurado, exige que el dominio coincida."""
    allowed = [d.lower() for d in settings.ALLOWED_EMAIL_DOMAINS if d.strip()]
    if not allowed:
        return email
    domain = email.split("@", 1)[-1].lower()
    if domain not in allowed:
        raise ValueError(
            f"El dominio del correo no está permitido. Permitidos: {', '.join(allowed)}"
        )
    return email


class UserCreate(BaseModel):
    """Payload para que un Admin cree un usuario nuevo."""

    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=120)
    password: str
    role_slug: str = Field(default="user", description="slug del rol: 'admin' | 'user'")
    is_active: bool = True

    @field_validator("password")
    @classmethod
    def _check_password(cls, value: str) -> str:
        return _validate_password_strength(value)

    @field_validator("email")
    @classmethod
    def _check_email_domain(cls, value: str) -> str:
        return _validate_email_domain(str(value))


class UserUpdate(BaseModel):
    """Payload parcial: solo campos editables por Admin."""

    full_name: Optional[str] = Field(default=None, min_length=1, max_length=120)
    role_slug: Optional[str] = None
    is_active: Optional[bool] = None


class UserResponse(BaseModel):
    id: uuid.UUID
    email: EmailStr
    full_name: str
    is_active: bool
    role: Optional[RoleResponse] = None
    created_at: datetime
    last_login_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)


# ── Auth flows ───────────────────────────────────────────────────────
class LoginResponse(Token):
    user: UserResponse

class PasswordRecovery(BaseModel):
    email: EmailStr

class UserUpdateMe(BaseModel):
    full_name: Optional[str] = None
    new_password: Optional[str] = None