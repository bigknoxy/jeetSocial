import importlib
from types import SimpleNamespace
from datetime import datetime, timedelta


def test_top_posts_returns_posts_ordered_by_kindness():
    """Top posts ordered by kindness then timestamp."""
    # Arrange: create simple post-like objects
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            message="a",
            kindness_points=5,
            timestamp=now - timedelta(hours=1),
        ),
        SimpleNamespace(
            id=2,
            message="b",
            kindness_points=10,
            timestamp=now - timedelta(hours=2),
        ),
        SimpleNamespace(
            id=3,
            message="c",
            kindness_points=5,
            timestamp=now - timedelta(minutes=30),
        ),
    ]

    # Act: attempt to import the not-yet-implemented post_service module
    post_service = importlib.import_module("app.post_service")
    top = post_service.top_posts(posts, window_hours=24)

    # Assert: expected order is 2,3,1 (10, then 5 newer, then 5 older)
    assert [p.id for p in top] == [2, 3, 1]


def test_top_posts_respects_window_cutoff():
    """Posts older than window_hours should be excluded."""
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            kindness_points=5,
            timestamp=now - timedelta(hours=2),
        ),
        SimpleNamespace(
            id=2,
            kindness_points=10,
            timestamp=now - timedelta(minutes=30),
        ),
    ]

    post_service = importlib.import_module("app.post_service")
    # Use a 1-hour window so the first post is excluded
    top = post_service.top_posts(posts, window_hours=1)
    assert [p.id for p in top] == [2]


def test_top_posts_applies_limit():
    """Limit parameter should restrict the number of returned posts."""
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=i,
            kindness_points=i,
            timestamp=now - timedelta(minutes=i),
        )
        for i in range(1, 6)
    ]

    post_service = importlib.import_module("app.post_service")
    top = post_service.top_posts(posts, window_hours=24, limit=2)
    # Expect top two kindness: 5 then 4
    assert [p.id for p in top] == [5, 4]


def test_top_posts_handles_zero_negative_and_ties():
    """Ensure zero/negative kindness and timestamp tie-breakers behave correctly."""
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            kindness_points=0,
            timestamp=now - timedelta(minutes=10),
        ),
        SimpleNamespace(
            id=2,
            kindness_points=-1,
            timestamp=now - timedelta(minutes=5),
        ),
        # tie on kindness, id=4 is newer than id=3
        SimpleNamespace(
            id=3,
            kindness_points=2,
            timestamp=now - timedelta(minutes=20),
        ),
        SimpleNamespace(
            id=4,
            kindness_points=2,
            timestamp=now - timedelta(minutes=1),
        ),
    ]

    post_service = importlib.import_module("app.post_service")
    top = post_service.top_posts(posts, window_hours=24)
    # Expected order: kindness 2 newest (4), kindness 2 older (3),
    # then 0 (1), then -1 (2)
    assert [p.id for p in top] == [4, 3, 1, 2]


def test_top_posts_limit_none_returns_all():
    """If limit is None, return all posts within the window."""
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=i,
            kindness_points=i,
            timestamp=now - timedelta(minutes=i),
        )
        for i in range(1, 4)
    ]

    post_service = importlib.import_module("app.post_service")
    top = post_service.top_posts(posts, window_hours=24, limit=None)
    assert len(top) == 3
