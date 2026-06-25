"""Add segment column to analyzed_posts table.

Segments extracted by LLM: Mobile, 2D Games, 3D Games, Indie, Education, AAA Games, Simulation.
Column is nullable — existing posts will have NULL until re-analyzed.

Revision ID: 005
Revises: 004
"""
from __future__ import annotations

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "005"
down_revision: Union[str, None] = "004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "analyzed_posts",
        sa.Column("segment", sa.String(50), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("analyzed_posts", "segment")
