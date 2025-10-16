"""
app/post_service.py

Service utilities for post-related computations.
"""

from datetime import datetime, timedelta
from typing import List, Optional

from app.models import Post


def top_posts(
    posts: Optional[List] = None,
    *,
    session=None,
    limit: int = 50,
    window_hours: int = 24,
):
    """Return posts ordered for the "top" view.

    Accepts either a list of objects with attributes `kindness_points` and
    `timestamp`, or a DB session (uses SQLAlchemy Post model) to query posts
    in the last `window_hours` hours ordered by kindness_points desc, then
    timestamp desc.
    """
    cutoff = datetime.utcnow() - timedelta(hours=window_hours)

    # DB-backed path (preferred for production/integration tests)
    if session is not None:
        try:
            query = Post.query
            query = query.filter(Post.timestamp >= cutoff)
            query = query.order_by(Post.kindness_points.desc(), Post.timestamp.desc())
            if limit:
                query = query.limit(limit)
            return query.all()
        except Exception:
            # Fallback: return empty list on DB error
            return []

    # In-memory path for unit tests: expect list-like objects
    if posts is None:
        return []

    # Filter to window
    filtered = [
        p
        for p in posts
        if getattr(p, "timestamp", None) is not None and p.timestamp >= cutoff
    ]
    # Sort by kindness_points desc, then timestamp desc
    sorted_posts = sorted(
        filtered,
        key=lambda p: (int(getattr(p, "kindness_points", 0) or 0), p.timestamp),
        reverse=True,
    )
    if limit:
        return sorted_posts[:limit]
    return sorted_posts
