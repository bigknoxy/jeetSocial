"""
Consolidated tests for post creation, paging, and character limits.
This file merges the previous conflicting versions into a single coherent test suite.
"""

import pytest
from app import create_app, db
from app.utils import is_hate_speech


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


def test_create_post(client):
    resp = client.post("/api/posts", json={"message": "You are awesome!"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert "username" in data
    assert data["message"] == "You are awesome!"


def test_hateful_post(client):
    resp = client.post("/api/posts", json={"message": "I am stupid"})
    assert resp.status_code == 403
    data = resp.get_json()
    assert "error" in data


def test_kind_post(client):
    resp = client.post("/api/posts", json={"message": "You are awesome and loved!"})
    assert resp.status_code == 201
    data = resp.get_json()
    assert "username" in data
    assert data["message"] == "You are awesome and loved!"


def test_neutral_post(client):
    resp = client.post("/api/posts", json={"message": "This is a post."})
    assert resp.status_code == 201
    data = resp.get_json()
    assert "username" in data
    assert data["message"] == "This is a post."


def test_paging(client):
    # Create 55 posts
    for i in range(55):
        client.post("/api/posts", json={"message": f"Post {i+1}"})
    # Page 1, limit 20
    resp = client.get("/api/posts?page=1&limit=20")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["posts"]) == 20
    assert data["page"] == 1
    assert data["limit"] == 20
    assert data["has_more"] is True
    # Page 3, limit 20 (should have 15 posts)
    resp = client.get("/api/posts?page=3&limit=20")
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["posts"]) == 15
    assert data["page"] == 3
    assert data["has_more"] is False


def test_empty_post(client):
    resp = client.post("/api/posts", json={"message": ""})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data


def test_post_rejection_reason_word_list():
    text = "You are a bigot!"
    is_hate, why, details = is_hate_speech(text)
    assert is_hate is True
    assert why == "word_list"
    assert details is not None
    assert details.lower() == "bigot"


def test_post_acceptance():
    text = "You are wonderful!"
    is_hate, why, details = is_hate_speech(text)
    assert is_hate is False
    assert why is None
    assert details is None


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
