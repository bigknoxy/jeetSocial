"""
conftest.py
Shared pytest fixtures for jeetSocial tests
"""

import pytest
from app import create_app, db


@pytest.fixture
def client():
    """Test client fixture for API testing"""
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
