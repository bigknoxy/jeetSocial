"""Add admin_actions table with hash chain for audit trail

Revision ID: 20251201_003200_add_admin_actions
Revises: 20251201_003100_add_admin_reports
Create Date: 2025-12-01 00:32:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251201_003200_add_admin_actions"
down_revision = "20251201_003100_add_admin_reports"
branch_labels = None
depends_on = None


def upgrade():
    """Create admin_actions table with hash chain for tamper resistance."""
    op.create_table(
        "admin_actions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("actor_id", sa.String(length=255), nullable=False),
        sa.Column("action_type", sa.String(length=100), nullable=False),
        sa.Column("action_payload", sa.JSON(), nullable=False),
        sa.Column("prev_hash", sa.String(length=64), nullable=True),
        sa.Column("curr_hash", sa.String(length=64), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance and audit functionality
    op.create_index("idx_admin_actions_created_at", "admin_actions", ["created_at"])
    op.create_index("idx_admin_actions_actor_id", "admin_actions", ["actor_id"])
    op.create_index("idx_admin_actions_action_type", "admin_actions", ["action_type"])
    op.create_index(
        "idx_admin_actions_curr_hash", "admin_actions", ["curr_hash"], unique=True
    )
    op.create_index("idx_admin_actions_prev_hash", "admin_actions", ["prev_hash"])


def downgrade():
    """Remove admin_actions table."""
    op.drop_table("admin_actions")
