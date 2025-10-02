"""Add kindness points and KindnessVote table

Revision ID: 20251002_032252
Revises: 099e5748762a
Create Date: 2025-10-02 20:43:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251002_032252"
down_revision = "099e5748762a"
branch_labels = None
depends_on = None


def upgrade():
    # Add kindness_points column to post table
    op.add_column(
        "post",
        sa.Column("kindness_points", sa.Integer(), nullable=False, server_default="0"),
    )
    op.alter_column("post", "kindness_points", server_default=None)

    # Create kindness_vote table
    op.create_table(
        "kindness_vote",
        sa.Column("id", sa.Integer(), primary_key=True, nullable=False),
        sa.Column(
            "post_id",
            sa.Integer(),
            sa.ForeignKey("post.id"),
            nullable=False,
            index=True,
        ),
        sa.Column(
            "token_hash", sa.String(length=64), nullable=False, unique=True, index=True
        ),
        sa.Column("created_at", sa.DateTime(), nullable=True),
    )


def downgrade():
    op.drop_table("kindness_vote")
    op.drop_column("post", "kindness_points")
