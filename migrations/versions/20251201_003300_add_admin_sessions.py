"""Add admin_sessions table for JWT refresh token management

Revision ID: 20251201_003300_add_admin_sessions
Revises: 20251201_003200_add_admin_actions
Create Date: 2025-12-01 00:33:00.000000

"""

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = "20251201_003300_add_admin_sessions"
down_revision = "20251201_003200_add_admin_actions"
branch_labels = None
depends_on = None


def upgrade():
    """Create admin_sessions table for secure session management."""
    op.create_table(
        "admin_sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("refresh_jti", sa.String(length=255), nullable=False),
        sa.Column("admin_id", sa.String(length=255), nullable=False),
        sa.Column(
            "issued_at", sa.DateTime(), nullable=False, server_default=sa.text("now()")
        ),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column(
            "revoked", sa.Boolean(), nullable=False, server_default=sa.text("false")
        ),
        sa.Column("device_hash", sa.String(length=64), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )

    # Create indexes for performance and security
    op.create_index(
        "idx_admin_sessions_refresh_jti", "admin_sessions", ["refresh_jti"], unique=True
    )
    op.create_index("idx_admin_sessions_admin_id", "admin_sessions", ["admin_id"])
    op.create_index("idx_admin_sessions_expires_at", "admin_sessions", ["expires_at"])
    op.create_index("idx_admin_sessions_revoked", "admin_sessions", ["revoked"])


def downgrade():
    """Remove admin_sessions table."""
    op.drop_table("admin_sessions")
