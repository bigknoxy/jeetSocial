"""
Rename posts -> post to keep schema consistent

Revision ID: 20251002_rename_posts_to_post
Revises: 20251001_032252
Create Date: 2025-10-02 00:00:00
"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "20251002_rename_posts_to_post"
down_revision = "20251001_032252"
branch_labels = None
depends_on = None


def upgrade():
    """If a legacy plural `posts` table exists (and `post` does not), rename it to `post`.
    Also attempt to rename a conventional sequence `posts_id_seq` -> `post_id_seq` if present.
    This keeps the DB schema aligned with the SQLAlchemy model which uses the singular `post`.
    """
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    # Only perform rename when 'posts' exists and 'post' does not, to avoid clobbering.
    if "posts" in table_names and "post" not in table_names:
        # Rename the table
        op.execute(sa.text("ALTER TABLE posts RENAME TO post"))

        # Try to rename the conventional sequence if it exists (Postgres serial naming)
        try:
            seqs = [
                r[0]
                for r in bind.execute(
                    sa.text("SELECT relname FROM pg_class WHERE relkind='S';")
                ).fetchall()
            ]
        except Exception:
            seqs = []

        if "posts_id_seq" in seqs and "post_id_seq" not in seqs:
            try:
                op.execute(sa.text("ALTER SEQUENCE posts_id_seq RENAME TO post_id_seq"))
            except Exception:
                # best-effort; leave as-is if it fails
                pass


def downgrade():
    """Reverse the rename: if `post` exists and `posts` does not, rename back."""
    bind = op.get_bind()
    inspector = sa.inspect(bind)
    table_names = inspector.get_table_names()

    if "post" in table_names and "posts" not in table_names:
        op.execute(sa.text("ALTER TABLE post RENAME TO posts"))

        try:
            seqs = [
                r[0]
                for r in bind.execute(
                    sa.text("SELECT relname FROM pg_class WHERE relkind='S';")
                ).fetchall()
            ]
        except Exception:
            seqs = []

        if "post_id_seq" in seqs and "posts_id_seq" not in seqs:
            try:
                op.execute(sa.text("ALTER SEQUENCE post_id_seq RENAME TO posts_id_seq"))
            except Exception:
                pass
