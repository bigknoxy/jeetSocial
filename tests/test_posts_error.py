"""
test_posts_error.py
"""

import pytest
from app import create_app, db


@pytest.fixture
def client():
    config_override = {
        "TESTING": True,
        "DEBUG": False,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "ENABLE_RATE_LIMITING": False,
    }
    result = create_app(config_override)
    # Handle tuple return from create_app()
    if isinstance(result, tuple):
        app, socketio_instance = result
    else:
        app = result
        # socketio_instance intentionally unused

    with app.test_client() as client:
        with app.app_context():
            db.create_all()
        yield client
        with app.app_context():
            db.drop_all()


def test_invalid_json(client):
    # When invalid JSON is sent, it should return a 400 Bad Request response
    # With our fix, this should now work correctly regardless of debug mode
    resp = client.post("/api/posts", data="not a json", content_type="application/json")
    assert resp.status_code == 400


def test_missing_message_field(client):
    resp = client.post("/api/posts", json={})
    assert resp.status_code == 400
    data = resp.get_json()
    assert "error" in data
