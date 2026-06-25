"""Tabla analyzed_posts + enums para KPIs del dashboard (posts analizados).

Alineado al DDL de negocio (sentiment, severity, riesgo, migración, etc.).
Idempotente:
  - Los ENUM se crean con DO … EXCEPTION duplicate_object.
  - Si `analyzed_posts` ya existe (p. ej. Aiven con datos), NO se vuelve a crear
    la tabla ni se duplican objetos.

Revision ID: 005
Revises: 004
"""

from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op
from sqlalchemy.dialects import postgresql

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE business_category_enum AS ENUM (
            'general', 'product', 'finance', 'ecosystem', 'positioning'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE sentiment_label_enum AS ENUM ('positive', 'negative', 'neutral');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE severity_enum AS ENUM ('low', 'medium', 'high', 'critical');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE risk_enum AS ENUM ('low', 'medium', 'high');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE impact_enum AS ENUM (
            'estimated_low', 'estimated_medium', 'estimated_high'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE migration_enum AS ENUM (
            'none', 'considering', 'migrated_from', 'migrated_to'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE trend_enum AS ENUM ('growing', 'stable', 'declining');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE stage_enum AS ENUM (
            'evaluation', 'implementation', 'production'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE region_enum AS ENUM ('na', 'emea', 'apac', 'latam');
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )
    op.execute(
        """
        DO $$ BEGIN
          CREATE TYPE alert_category_enum AS ENUM (
            'technical', 'financial', 'competitive', 'community'
          );
        EXCEPTION WHEN duplicate_object THEN NULL; END $$;
        """
    )

    business_cat = postgresql.ENUM(
        "general",
        "product",
        "finance",
        "ecosystem",
        "positioning",
        name="business_category_enum",
        create_type=False,
    )
    sentiment_l = postgresql.ENUM(
        "positive",
        "negative",
        "neutral",
        name="sentiment_label_enum",
        create_type=False,
    )
    severity_e = postgresql.ENUM(
        "low",
        "medium",
        "high",
        "critical",
        name="severity_enum",
        create_type=False,
    )
    risk_e = postgresql.ENUM(
        "low",
        "medium",
        "high",
        name="risk_enum",
        create_type=False,
    )
    impact_e = postgresql.ENUM(
        "estimated_low",
        "estimated_medium",
        "estimated_high",
        name="impact_enum",
        create_type=False,
    )
    migration_e = postgresql.ENUM(
        "none",
        "considering",
        "migrated_from",
        "migrated_to",
        name="migration_enum",
        create_type=False,
    )
    trend_e = postgresql.ENUM(
        "growing",
        "stable",
        "declining",
        name="trend_enum",
        create_type=False,
    )
    stage_e = postgresql.ENUM(
        "evaluation",
        "implementation",
        "production",
        name="stage_enum",
        create_type=False,
    )
    region_e = postgresql.ENUM(
        "na",
        "emea",
        "apac",
        "latam",
        name="region_enum",
        create_type=False,
    )
    alert_cat = postgresql.ENUM(
        "technical",
        "financial",
        "competitive",
        "community",
        name="alert_category_enum",
        create_type=False,
    )

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    existing = set(inspector.get_table_names())
    if "analyzed_posts" in existing:
        idx_names = {i["name"] for i in inspector.get_indexes("analyzed_posts")}
        if "ix_analyzed_posts_date_post" not in idx_names:
            op.create_index(
                "ix_analyzed_posts_date_post",
                "analyzed_posts",
                ["date_post"],
                unique=False,
            )
        return

    op.create_table(
        "analyzed_posts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.Text(), nullable=True),
        sa.Column("summary", sa.Text(), nullable=True),
        sa.Column("url", sa.Text(), nullable=True),
        sa.Column("date_post", sa.DateTime(), nullable=True),
        sa.Column("source_platform", sa.Text(), nullable=True),
        sa.Column("source_subreddit", sa.Text(), nullable=True),
        sa.Column("source_author", sa.Text(), nullable=True),
        sa.Column("upvotes", sa.Integer(), nullable=True),
        sa.Column("comments", sa.Integer(), nullable=True),
        sa.Column("shares", sa.Integer(), nullable=True),
        sa.Column("sentiment_score", sa.Float(), nullable=True),
        sa.Column("sentiment_label", sentiment_l, nullable=True),
        sa.Column("sentiment_confidence", sa.Float(), nullable=True),
        sa.Column("platform_mentioned", sa.Text(), nullable=True),
        sa.Column("bug_category", sa.Text(), nullable=True),
        sa.Column("severity", severity_e, nullable=True),
        sa.Column("unity_version", sa.Text(), nullable=True),
        sa.Column("affected_platforms", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("churn_risk", risk_e, nullable=True),
        sa.Column("churn_probability", sa.Float(), nullable=True),
        sa.Column("revenue_impact", impact_e, nullable=True),
        sa.Column("user_segment", sa.Text(), nullable=True),
        sa.Column("competitor_mentioned", sa.Text(), nullable=True),
        sa.Column("comparison_type", sa.Text(), nullable=True),
        sa.Column("migration_intent", migration_e, nullable=True),
        sa.Column("sentiment_strength", sa.Float(), nullable=True),
        sa.Column("would_recommend", sa.Boolean(), nullable=True),
        sa.Column("key_factors", postgresql.ARRAY(sa.Text()), nullable=True),
        sa.Column("industry_trend", trend_e, nullable=True),
        sa.Column("adoption_stage", stage_e, nullable=True),
        sa.Column("company_size", sa.Text(), nullable=True),
        sa.Column("geographic_region", region_e, nullable=True),
        sa.Column("alert_type", alert_cat, nullable=True),
        sa.Column("alert_urgency", severity_e, nullable=True),
        sa.Column("alert_reach", sa.Integer(), nullable=True),
        sa.Column("alert_influence_score", sa.Float(), nullable=True),
        sa.Column("business_category", business_cat, nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_analyzed_posts_date_post",
        "analyzed_posts",
        ["date_post"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        "ix_analyzed_posts_date_post", table_name="analyzed_posts", if_exists=True
    )
    op.drop_table("analyzed_posts", if_exists=True)
    op.execute("DROP TYPE IF EXISTS business_category_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS sentiment_label_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS severity_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS risk_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS impact_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS migration_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS trend_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS stage_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS region_enum CASCADE;")
    op.execute("DROP TYPE IF EXISTS alert_category_enum CASCADE;")
