"""Asegura usuario admin@unitynexus.com para entornos Unity Nexus (Swagger / docs).

Idempotente: si el email ya existe, no modifica nada. Contraseña inicial alineada
con INITIAL_ADMIN_PASSWORD típico (Admin123Change!) — cámbiala en producción.

Revision ID: 004
Revises: 002
"""

from __future__ import annotations

import os
from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

revision: str = "004"
down_revision: Union[str, None] = "002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_EMAIL = "admin@unitynexus.com"


def upgrade() -> None:
    bind = op.get_bind()
    exists = bind.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email"),
        {"email": _EMAIL},
    ).first()
    if exists is not None:
        return

    admin_role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE slug = 'admin'")
    ).scalar_one()

    pwd = os.environ.get("INITIAL_ADMIN_PASSWORD", "Admin123Change!")
    hashed = bcrypt.hashpw(pwd.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    bind.execute(
        sa.text(
            """
            INSERT INTO users (email, full_name, hashed_password, role_id, is_active)
            VALUES (:email, :full_name, :pwd, :role_id, true)
            """
        ),
        {
            "email": _EMAIL,
            "full_name": "Unity Nexus Admin",
            "pwd": hashed,
            "role_id": admin_role_id,
        },
    )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": _EMAIL},
    )
