"""
conftest.py
Shared pytest fixtures for jeetSocial tests
"""

import os
import sys
import pytest

# Ensure project root is on PYTHONPATH so tests can import the `app` package
BASE_DIR = os.path.dirname(__file__)
ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
if ROOT not in sys.path:
    sys.path.insert(0, ROOT)

# Import app internals lazily inside fixtures to avoid requiring Flask
# when running unit tests that don't use the client fixture


@pytest.fixture
def client():
    """Test client fixture for API testing"""
    # Import the app module object and call create_app, then reference app.db
    import app as app_pkg

    config_override = {
        "TESTING": True,
        "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
        "ENABLE_RATE_LIMITING": False,
    }
    app = app_pkg.create_app(config_override)
    with app.test_client() as client:
        with app.app_context():
            app_pkg.db.create_all()
        yield client
        with app.app_context():
            app_pkg.db.drop_all()
