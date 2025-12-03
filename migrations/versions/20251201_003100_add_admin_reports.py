"""Add admin_reports table

Revision ID: 20251201_003100_add_admin_reports
Revises: 20251002_rename_posts_to_post
Create Date: 2025-12-01 00:31:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251201_003100_add_admin_reports"
down_revision = "20251002_rename_posts_to_post"
branch_labels = None
depends_on = None


def upgrade():
    """Create admin_reports table with minimal fields for privacy-first design."""
    op.create_table(
        "admin_reports",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("post_id", sa.Integer(), nullable=False),
        sa.Column("reason", sa.String(length=255), nullable=False),
        sa.Column(
            "status", sa.String(length=50), nullable=False, server_default="pending"
        ),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column("updated_at", sa.DateTime(), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(
            ["post_id"],
            ["post.id"],
            name="fk_admin_reports_post_id",
            ondelete="CASCADE",
        ),
    )

    # Create indexes for performance
    op.create_index("idx_admin_reports_created_at", "admin_reports", ["created_at"])
    op.create_index("idx_admin_reports_status", "admin_reports", ["status"])
    op.create_index("idx_admin_reports_post_id", "admin_reports", ["post_id"])


def downgrade():
    """Remove admin_reports table."""
    op.drop_table("admin_reports")
