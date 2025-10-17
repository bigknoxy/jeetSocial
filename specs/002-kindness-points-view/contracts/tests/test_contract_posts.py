import pytest
from app import create_app, db
from app.models import Post


@pytest.fixture
def client():
    config_override = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "ENABLE_RATE_LIMITING": False,
        "ENABLE_KINDNESS_POINTS": "1",
    }
    app = create_app(config_override)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


def test_get_posts_top_view_contract(client):
    """Contract test for GET /api/posts?view=top endpoint."""
    # Create test posts with different kindness_points
    with client.application.app_context():
        # Create posts with timestamps within last 24 hours
        from datetime import datetime, timedelta

        now = datetime.utcnow()
        post1 = Post()
        post1.username = "user1"
        post1.message = "Post 1"
        post1.timestamp = now - timedelta(hours=1)
        post1.kindness_points = 5
        post2 = Post()
        post2.username = "user2"
        post2.message = "Post 2"
        post2.timestamp = now - timedelta(hours=2)
        post2.kindness_points = 10
        post3 = Post()
        post3.username = "user3"
        post3.message = "Post 3"
        post3.timestamp = now - timedelta(hours=3)
        post3.kindness_points = 3
        db.session.add_all([post1, post2, post3])
        db.session.commit()

    # GET /api/posts?view=top
    resp = client.get("/api/posts?view=top")
    assert resp.status_code == 200
    data = resp.get_json()
    assert isinstance(data, list)
    # Should return posts ordered by kindness_points desc, then timestamp desc
    assert len(data) == 3
    # Highest points first
    assert data[0]["kindness_points"] == 10  # post2
    assert data[1]["kindness_points"] == 5  # post1
    assert data[2]["kindness_points"] == 3  # post3
    # Check required fields
    for post in data:
        assert "id" in post
        assert "username" in post
        assert "message" in post
        assert "kindness_points" in post
        assert "timestamp" in post
