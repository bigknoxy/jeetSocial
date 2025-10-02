"""Placeholder migration to satisfy missing revision

Revision ID: 20251001_032252
Revises: 099e5748762a
Create Date: 2025-10-02 21:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251001_032252"
down_revision = "099e5748762a"
branch_labels = None
depends_on = None


def upgrade():
    # No-op placeholder: migration file was missing in repo but already applied in DB.
    pass


def downgrade():
    pass
