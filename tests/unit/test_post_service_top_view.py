from datetime import datetime, timedelta
from types import SimpleNamespace
from app.post_service import top_posts


def test_top_posts_filters_posts_within_24_hours():
    """Test that top_posts only returns posts created within the last 24 hours."""
    # Arrange
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            message="Recent post",
            timestamp=now - timedelta(hours=12),
            kindness_points=10,
        ),
        SimpleNamespace(
            id=2,
            message="Old post",
            timestamp=now - timedelta(hours=48),
            kindness_points=20,
        ),
    ]

    # Act
    result = top_posts(posts, window_hours=24)

    # Assert
    # Should only include the recent post
    assert len(result) == 1
    assert result[0].id == 1


def test_top_posts_orders_by_kindness_points_desc_then_timestamp_desc():
    """Ensure top_posts orders by kindness_points descending, then timestamp descending.
    Verifies posts with equal kindness_points are ordered by newer timestamps first.
    """
    # Arrange
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            message="Post 1",
            timestamp=now - timedelta(hours=1),
            kindness_points=15,
        ),
        SimpleNamespace(
            id=2,
            message="Post 2",
            timestamp=now - timedelta(hours=2),
            kindness_points=20,  # Higher points, older
        ),
        SimpleNamespace(
            id=3,
            message="Post 3",
            timestamp=now - timedelta(hours=3),
            kindness_points=15,  # Same points, older
        ),
        SimpleNamespace(
            id=4,
            message="Post 4",
            timestamp=now - timedelta(hours=4),
            kindness_points=10,
        ),
    ]

    # Act
    result = top_posts(posts, window_hours=24)

    # Assert
    # Expected order: post2 (20 points), post1 (15 points, newer),
    # post3 (15 points, older), post4 (10 points)
    assert result[0].id == 2  # Highest points
    assert result[1].id == 1  # Same points as post3 but newer
    assert result[2].id == 3  # Same points as post1 but older
    assert result[3].id == 4  # Lowest points


def test_top_posts_respects_limit():
    """Test that top_posts respects the limit parameter."""
    # Arrange
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=i,
            message=f"Post {i}",
            timestamp=now - timedelta(hours=i),
            kindness_points=10 - i,
        )
        for i in range(5)
    ]

    # Act
    result = top_posts(posts, window_hours=24, limit=3)

    # Assert
    assert len(result) == 3
    # Should be ordered by kindness_points desc: 10-0=10, 10-1=9, 10-2=8
    assert result[0].id == 0
    assert result[1].id == 1
    assert result[2].id == 2


def test_top_posts_with_no_posts_in_window():
    """Test that top_posts returns empty list if no posts in the last 24 hours."""
    """Test that top_posts returns empty list if no posts in the last 24 hours."""
    now = datetime.utcnow()
    posts = [
        SimpleNamespace(
            id=1,
            message="Old post",
            timestamp=now - timedelta(hours=48),
            kindness_points=10,
        ),
    ]

    # Act
    result = top_posts(posts, window_hours=24)

    # Assert
    assert result == []
