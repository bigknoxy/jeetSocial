"""
Security tests for XSS vulnerabilities in admin portal.
Tests attempt to exploit XSS vectors and verify they are properly blocked.
"""

import os
import html
import re
from unittest.mock import patch, MagicMock

# Set environment variable before importing app
os.environ["ENABLE_ADMIN_PORTAL"] = "1"

# Import app creation function
from app import create_app, db


def get_test_app():
    """Helper to get Flask app from create_app result."""
    app_result = create_app(
        {
            "TESTING": True,
            "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:",
            "ENABLE_ADMIN_PORTAL": "1",
        }
    )
    return app_result[0] if isinstance(app_result, tuple) else app_result


class TestSecurityInputValidation: