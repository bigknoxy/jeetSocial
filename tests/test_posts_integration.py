"""
test_posts_integration.py
"""

import pytest
from app import create_app, db


@pytest.fixture
def client():
    config_override = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "ENABLE_RATE_LIMITING": False,
    }
    app = create_app(config_override)
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


def test_post_and_fetch(client):
    # Create post
    resp = client.post("/api/posts", json={"message": "Integration test post"})
    assert resp.status_code == 201
    # Fetch posts
    resp = client.get("/api/posts")
    assert resp.status_code == 200
    data = resp.get_json()
    assert any(post["message"] == "Integration test post" for post in data["posts"])


def test_db_error_handling(client, monkeypatch):
    # Simulate DB error
    def fail_commit():
        raise Exception("DB error simulated")

    monkeypatch.setattr(db.session, "commit", fail_commit)
    resp = client.post("/api/posts", json={"message": "Should fail"})
    assert resp.status_code in (500, 400, 403)


def test_message_character_limit_exact(client):
    """Test message with exactly 280 characters is accepted"""
    message = "a" * 280
    resp = client.post("/api/posts", json={"message": message})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["message"] == message


def test_message_character_limit_exceeded(client):
    """Test message over 280 characters is rejected"""
    message = "a" * 281
    resp = client.post("/api/posts", json={"message": message})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
    assert "exceeds 280 character limit" in data["error"]


def test_message_character_limit_under_limit(client):
    """Test message under 280 characters is accepted"""
    message = "This is a valid message under the limit!"
    resp = client.post("/api/posts", json={"message": message})
    assert resp.status_code == 201
    data = resp.get_json()
    assert data["message"] == message


def test_message_character_limit_boundary_plus_one(client):
    """Test message with 281 characters is rejected"""
    message = "a" * 281
    resp = client.post("/api/posts", json={"message": message})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
    assert "exceeds 280 character limit" in data["error"]
