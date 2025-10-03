"""
Add kindness points feature

Revision ID: 20251001_032252
Revises: 099e5748762a
Create Date: 2025-10-01 03:22:52
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251001_032252"
down_revision = "099e5748762a"
branch_labels = None
depends_on = None


def upgrade():
    # Determine whether the DB has 'posts' or legacy 'post' table
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "posts" in table_names:
        posts_table = "posts"
    elif "post" in table_names:
        posts_table = "post"
    else:
        # If neither exists (clean DB), create legacy singular 'post' table to
        # remain compatible with the SQLAlchemy model and initial migration.
        op.create_table(
            "post",
            sa.Column("id", sa.Integer(), nullable=False),
            sa.Column("username", sa.String(length=32), nullable=False),
            sa.Column("message", sa.Text(), nullable=False),
            sa.Column("timestamp", sa.DateTime(), nullable=True),
            sa.PrimaryKeyConstraint("id"),
        )
        posts_table = "post"

    # Add kindness_points column to the detected posts table
    op.add_column(
        posts_table,
        sa.Column("kindness_points", sa.Integer(), nullable=False, server_default="0"),
    )

    # Create kindness_votes table referencing the detected posts table
    op.create_table(
        "kindness_votes",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "post_id", sa.Integer(), sa.ForeignKey(f"{posts_table}.id"), nullable=False
        ),
        sa.Column("token_hash", sa.String(64), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime(), server_default=sa.func.now()),
    )

    # Add indexes for performance
    op.create_index("ix_kindness_votes_post_id", "kindness_votes", ["post_id"])
    op.create_index(
        "ix_kindness_votes_token_hash", "kindness_votes", ["token_hash"], unique=True
    )


def downgrade():
    # Drop kindness_votes table and remove kindness_points column if present
    op.drop_index("ix_kindness_votes_token_hash", table_name="kindness_votes")
    op.drop_index("ix_kindness_votes_post_id", table_name="kindness_votes")
    op.drop_table("kindness_votes")

    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()
    if "posts" in table_names:
        op.drop_column("posts", "kindness_points")
    elif "post" in table_names:
        op.drop_column("post", "kindness_points")
