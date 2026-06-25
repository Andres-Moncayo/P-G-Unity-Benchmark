"""Schema simplificado (7 tablas): roles, users, logs, posts, metric_history, chat_history, alerts.

Reemplaza el schema original de 17 tablas. Decisión del líder de equipo:
solo se necesitan las tablas esenciales para el MVP.

Revision ID: 001
Revises:
Create Date: 2026-05-05
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Extensiones requeridas ───────────────────────────────────────
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto;")  # gen_random_uuid()
    op.execute("CREATE EXTENSION IF NOT EXISTS citext;")  # email case-insensitive

    # ──────────────────────────────────────────────────────────────────
    # IDENTITY
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "roles",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("name", sa.String(length=60), nullable=False),
        sa.Column("slug", sa.String(length=50), nullable=False),
        sa.Column("description", sa.String(length=255), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )

    op.create_table(
        "users",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("email", postgresql.CITEXT(), nullable=False),
        sa.Column("full_name", sa.String(length=120), nullable=False),
        sa.Column("hashed_password", sa.String(length=255), nullable=False),
        sa.Column(
            "is_active", sa.Boolean(), server_default=sa.text("true"), nullable=False
        ),
        sa.Column("role_id", sa.BigInteger(), nullable=True),
        sa.Column("created_by_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("email"),
        sa.ForeignKeyConstraint(
            ["role_id"], ["roles.id"], onupdate="CASCADE", ondelete="SET NULL"
        ),
        sa.ForeignKeyConstraint(
            ["created_by_id"], ["users.id"], onupdate="CASCADE", ondelete="SET NULL"
        ),
    )

    # ──────────────────────────────────────────────────────────────────
    # LOGS (auditoría de acciones específicas)
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "logs",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("action", sa.String(length=100), nullable=False),
        sa.Column("entity_type", sa.String(length=60), nullable=True),
        sa.Column("entity_id", sa.String(length=255), nullable=True),
        sa.Column(
            "details",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("ip_address", sa.String(length=45), nullable=True),
        sa.Column("user_agent", sa.Text(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], onupdate="CASCADE", ondelete="SET NULL"
        ),
    )
    op.create_index("ix_logs_user_id", "logs", ["user_id"])
    op.create_index("ix_logs_action", "logs", ["action"])
    op.create_index("ix_logs_created_at", "logs", ["created_at"])

    # ──────────────────────────────────────────────────────────────────
    # POSTS (contenido analizado: sentimiento, bugs, performance, churn, NPS)
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "posts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=500), nullable=False),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column(
            "date",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        # Análisis de sentimiento: positive, negative, neutral
        sa.Column("sentiment", sa.String(length=20), nullable=False),
        # Bug tracking: texto libre (ej: Bug_Crash, Bug_UI, null)
        sa.Column("bug", sa.String(length=100), nullable=True),
        # Performance: low / high
        sa.Column("performance", sa.String(length=10), nullable=True),
        # Churn
        sa.Column(
            "churn_risk", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("churn_percentage", sa.Numeric(5, 2), nullable=True),
        # Plataforma: unity / competitor
        sa.Column("platform", sa.String(length=50), nullable=False),
        # NPS
        sa.Column(
            "promoter", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        sa.Column(
            "detractor", sa.Integer(), server_default=sa.text("0"), nullable=False
        ),
        # Nivel de alerta: low / middle / high
        sa.Column(
            "alert_type",
            sa.String(length=10),
            server_default=sa.text("'low'"),
            nullable=False,
        ),
        # Metadata extensible (campos futuros sin migración)
        sa.Column(
            "metadata",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.CheckConstraint(
            "sentiment IN ('positive', 'negative', 'neutral')",
            name="ck_posts_sentiment",
        ),
        sa.CheckConstraint(
            "performance IS NULL OR performance IN ('low', 'high')",
            name="ck_posts_performance",
        ),
        sa.CheckConstraint(
            "platform IN ('unity', 'competitor')", name="ck_posts_platform"
        ),
        sa.CheckConstraint(
            "alert_type IN ('low', 'middle', 'high')", name="ck_posts_alert_type"
        ),
    )
    op.create_index("ix_posts_date", "posts", ["date"])
    op.create_index("ix_posts_platform", "posts", ["platform"])
    op.create_index("ix_posts_sentiment", "posts", ["sentiment"])
    op.create_index("ix_posts_alert_type", "posts", ["alert_type"])
    op.create_index(
        "ix_posts_metadata_gin", "posts", ["metadata"], postgresql_using="gin"
    )

    # ──────────────────────────────────────────────────────────────────
    # METRIC HISTORY (historial de métricas — fusiona definitions + snapshots)
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "metric_history",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("metric_key", sa.String(length=100), nullable=False),
        sa.Column("metric_name", sa.String(length=255), nullable=False),
        sa.Column("value", sa.Numeric(18, 4), nullable=False),
        sa.Column("unit", sa.String(length=30), nullable=True),
        sa.Column(
            "dimensions",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("source", sa.String(length=120), nullable=True),
        sa.Column(
            "recorded_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_metric_history_key_recorded",
        "metric_history",
        ["metric_key", "recorded_at"],
    )
    op.create_index(
        "ix_metric_history_dimensions_gin",
        "metric_history",
        ["dimensions"],
        postgresql_using="gin",
    )

    # ──────────────────────────────────────────────────────────────────
    # CHAT HISTORY (historial de chat — fusiona threads + messages)
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "chat_history",
        sa.Column(
            "id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column(
            "thread_id",
            postgresql.UUID(as_uuid=True),
            server_default=sa.text("gen_random_uuid()"),
            nullable=False,
        ),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column(
            "citations",
            postgresql.JSONB(astext_type=sa.Text()),
            server_default=sa.text("'{}'::jsonb"),
            nullable=False,
        ),
        sa.Column("model_used", sa.String(length=100), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], onupdate="CASCADE", ondelete="CASCADE"
        ),
        sa.CheckConstraint(
            "role IN ('user', 'assistant', 'system')", name="ck_chat_history_role"
        ),
    )
    op.create_index(
        "ix_chat_history_thread", "chat_history", ["thread_id", "created_at"]
    )
    op.create_index("ix_chat_history_user", "chat_history", ["user_id"])

    # ──────────────────────────────────────────────────────────────────
    # ALERTS (alertas — se generan automáticamente desde posts con alert_type=high)
    # ──────────────────────────────────────────────────────────────────
    op.create_table(
        "alerts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("user_id", postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column("post_id", sa.BigInteger(), nullable=True),
        sa.Column(
            "severity",
            sa.String(length=10),
            server_default=sa.text("'low'"),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("message", sa.Text(), nullable=True),
        sa.Column(
            "is_read", sa.Boolean(), server_default=sa.text("false"), nullable=False
        ),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.text("NOW()"),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["user_id"], ["users.id"], onupdate="CASCADE", ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(
            ["post_id"], ["posts.id"], onupdate="CASCADE", ondelete="SET NULL"
        ),
        sa.CheckConstraint(
            "severity IN ('low', 'middle', 'high')", name="ck_alerts_severity"
        ),
    )
    op.create_index("ix_alerts_user_unread", "alerts", ["user_id", "is_read"])
    op.create_index("ix_alerts_severity", "alerts", ["severity", "created_at"])


def downgrade() -> None:
    op.drop_table("alerts")
    op.drop_table("chat_history")
    op.drop_table("metric_history")
    op.drop_table("posts")
    op.drop_table("logs")
    op.drop_table("users")
    op.drop_table("roles")
    # No dropeamos las extensiones: pueden ser usadas por otras DBs/schemas.
