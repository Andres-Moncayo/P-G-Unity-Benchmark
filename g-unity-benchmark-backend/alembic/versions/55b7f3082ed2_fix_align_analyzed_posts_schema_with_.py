"""fix: align analyzed_posts schema with ORM model

Adds missing columns to analyzed_posts table:
- sentimental: sentiment classification (maps from sentiment_label)
- bug: bug category (maps from bug_category)
- performance: performance impact (new column)
- churn_percentage: churn probability percentage (maps from churn_probability)
- promotor: NPS promoter count (new column, defaults to 0)
- detractor: NPS detractor count (new column, defaults to 0)
- segment: market segment (maps from user_segment)
- financial_data: JSONB for revenue/financial data (new column)
- created_at: timestamp (new column, defaults to NOW())

Revision ID: 55b7f3082ed2
Revises: 005
Create Date: 2026-05-15 14:07:29.328747

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '55b7f3082ed2'
down_revision: Union[str, None] = '005'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add missing columns to analyzed_posts
    op.add_column('analyzed_posts', sa.Column('sentimental', sa.String(length=20), nullable=True))
    op.add_column('analyzed_posts', sa.Column('bug', sa.String(length=255), nullable=True))
    op.add_column('analyzed_posts', sa.Column('performance', sa.String(length=100), nullable=True))
    op.add_column('analyzed_posts', sa.Column('churn_percentage', sa.Integer(), nullable=True))
    op.add_column('analyzed_posts', sa.Column('promotor', sa.SmallInteger(), nullable=False, server_default='0'))
    op.add_column('analyzed_posts', sa.Column('detractor', sa.SmallInteger(), nullable=False, server_default='0'))
    op.add_column('analyzed_posts', sa.Column('segment', sa.String(length=100), nullable=True))
    op.add_column('analyzed_posts', sa.Column('financial_data', postgresql.JSONB(), nullable=True))
    op.add_column('analyzed_posts', sa.Column('created_at', sa.DateTime(), server_default=sa.func.now(), nullable=False))

    # Data migration: map existing columns to new ones
    op.execute("""
        UPDATE analyzed_posts
        SET sentimental = CASE
            WHEN sentiment_label = 'positive' THEN 'positive'
            WHEN sentiment_label = 'negative' THEN 'negative'
            WHEN sentiment_label = 'neutral' THEN 'neutral'
            ELSE 'neutral'
        END
        WHERE sentimental IS NULL;
    """)

    op.execute("""
        UPDATE analyzed_posts
        SET bug = bug_category
        WHERE bug IS NULL AND bug_category IS NOT NULL;
    """)

    op.execute("""
        UPDATE analyzed_posts
        SET churn_percentage = CAST(churn_probability * 100 AS INTEGER)
        WHERE churn_percentage IS NULL AND churn_probability IS NOT NULL;
    """)

    op.execute("""
        UPDATE analyzed_posts
        SET segment = user_segment
        WHERE segment IS NULL AND user_segment IS NOT NULL;
    """)


def downgrade() -> None:
    # Remove added columns
    op.drop_column('analyzed_posts', 'created_at')
    op.drop_column('analyzed_posts', 'financial_data')
    op.drop_column('analyzed_posts', 'segment')
    op.drop_column('analyzed_posts', 'detractor')
    op.drop_column('analyzed_posts', 'promotor')
    op.drop_column('analyzed_posts', 'churn_percentage')
    op.drop_column('analyzed_posts', 'performance')
    op.drop_column('analyzed_posts', 'bug')
    op.drop_column('analyzed_posts', 'sentimental')
