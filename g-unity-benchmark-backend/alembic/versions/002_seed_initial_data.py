"""Seed inicial: roles base (admin, user) y primer usuario administrador.

Lee credenciales del primer admin desde variables de entorno
(INITIAL_ADMIN_EMAIL, INITIAL_ADMIN_PASSWORD, INITIAL_ADMIN_FULL_NAME).

Si el admin ya existe, no se vuelve a crear (idempotente).

Revision ID: 002
Revises: 001
Create Date: 2026-04-28
"""

from typing import Sequence, Union

import bcrypt
import sqlalchemy as sa
from alembic import op

from core.config import settings

revision: str = "002"
down_revision: Union[str, None] = "001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()

    # ── Roles base ───────────────────────────────────────────────────
    bind.execute(
        sa.text(
            """
            INSERT INTO roles (name, slug, description)
            VALUES
                ('Admin', 'admin', 'Plataforma: gestión de usuarios y sistema'),
                ('User',  'user',  'Acceso estándar a dashboard, chat y métricas')
            ON CONFLICT (slug) DO NOTHING;
            """
        )
    )

    admin_role_id = bind.execute(
        sa.text("SELECT id FROM roles WHERE slug = 'admin'")
    ).scalar_one()

    # ── Primer admin ─────────────────────────────────────────────────
    existing = bind.execute(
        sa.text("SELECT 1 FROM users WHERE email = :email"),
        {"email": settings.INITIAL_ADMIN_EMAIL},
    ).first()

    if existing is None:
        hashed = bcrypt.hashpw(
            settings.INITIAL_ADMIN_PASSWORD.encode("utf-8"),
            bcrypt.gensalt(),
        ).decode("utf-8")

        bind.execute(
            sa.text(
                """
                INSERT INTO users (email, full_name, hashed_password, role_id, is_active)
                VALUES (:email, :full_name, :pwd, :role_id, true)
                """
            ),
            {
                "email": settings.INITIAL_ADMIN_EMAIL,
                "full_name": settings.INITIAL_ADMIN_FULL_NAME,
                "pwd": hashed,
                "role_id": admin_role_id,
            },
        )


def downgrade() -> None:
    bind = op.get_bind()
    bind.execute(
        sa.text("DELETE FROM users WHERE email = :email"),
        {"email": settings.INITIAL_ADMIN_EMAIL},
    )
    bind.execute(sa.text("DELETE FROM roles WHERE slug IN ('admin', 'user')"))
