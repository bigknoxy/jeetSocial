"""
Unit tests for admin routes following TDD approach.
Tests are written to fail first, then implementation will make them pass.
"""

import json
import os
from unittest.mock import patch

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


class TestAdminRoutes:
    """Test admin API routes."""

    def test_admin_login_endpoint(self):
        """Test admin login endpoint with MFA."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Test successful login
                login_data = {
                    "admin_id": "admin-1",
                    "password": "test_password",
                    "mfa_code": "123456",
                }

                with patch(
                    "app.admin.auth_service.AuthService.verify_mfa", return_value=True
                ):
                    response = client.post(
                        "/admin/login", json=login_data, content_type="application/json"
                    )

                    assert response.status_code == 200
                    data = json.loads(response.data)
                    assert "access_token" in data
                    assert "csrf_token" in data

                    # Check security headers
                    assert "Set-Cookie" in response.headers
                    cookies = response.headers.getlist("Set-Cookie")
                    assert any("access_token=" in cookie for cookie in cookies)
                    assert any("csrf_token=" in cookie for cookie in cookies)

    def test_admin_login_invalid_credentials(self):
        """Test admin login with invalid credentials."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Test invalid login
                login_data = {
                    "admin_id": "admin-1",
                    "password": "wrong_password",
                    "mfa_code": "123456",
                }

                with patch(
                    "app.admin.auth_service.AuthService.verify_mfa", return_value=False
                ):
                    response = client.post(
                        "/admin/login", json=login_data, content_type="application/json"
                    )

                    assert response.status_code == 401
                    data = json.loads(response.data)
                    assert "error" in data

    def test_admin_logout_endpoint(self):
        """Test admin logout endpoint."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    response = client.post("/admin/logout")

                    assert response.status_code == 200
                    data = json.loads(response.data)
                    assert data["message"] == "Logged out successfully"

                    # Check cookies are cleared
                    cookies = response.headers.getlist("Set-Cookie")
                    cleared_cookies = [c for c in cookies if "Max-Age=0" in c]
                    assert len(cleared_cookies) >= 2

    def test_get_moderation_queue_endpoint(self):
        """Test getting moderation queue."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        (
                            "app.admin.moderation_service.ModerationService."
                            "get_moderation_queue"
                        ),
                        return_value=[{"id": 1, "status": "pending"}],
                    ):
                        response = client.get("/admin/reports/queue")

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert isinstance(data, list)
                        assert len(data) >= 0

    def test_get_reports_endpoint(self):
        """Test getting reports by status."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        "app.admin.report_service.ReportService.get_reports_by_status",
                        return_value=[{"id": 1, "status": "pending"}],
                    ):
                        response = client.get("/admin/reports?status=pending")

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert isinstance(data, list)

    def test_delete_post_endpoint(self):
        """Test post deletion endpoint."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        "app.admin.moderation_service.ModerationService.delete_post",
                        return_value=True,
                    ):
                        response = client.delete("/admin/posts/123")

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert data["success"] is True

    def test_dismiss_report_endpoint(self):
        """Test report dismissal endpoint."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        "app.admin.moderation_service.ModerationService.dismiss_report",
                        return_value=True,
                    ):
                        dismiss_data = {"note": "No violation found"}
                        response = client.post(
                            "/admin/reports/123/dismiss",
                            json=dismiss_data,
                            content_type="application/json",
                        )

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert data["success"] is True

    def test_bulk_action_endpoint(self):
        """Test bulk action endpoint."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        "app.admin.moderation_service.ModerationService.bulk_delete_posts",
                        return_value={"deleted_count": 3, "audit_entries_created": 3},
                    ):
                        bulk_data = {
                            "action": "delete_posts",
                            "post_ids": [1, 2, 3],
                            "reason": "Spam campaign",
                        }
                        response = client.post(
                            "/admin/bulk-action",
                            json=bulk_data,
                            content_type="application/json",
                        )

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert data["deleted_count"] == 3

    def test_get_moderation_stats_endpoint(self):
        """Test getting moderation statistics."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    with patch(
                        "app.admin.moderation_service.ModerationService.get_moderation_stats",
                        return_value={"pending_reports": 5, "total_reports": 10},
                    ):
                        response = client.get("/admin/stats")

                        assert response.status_code == 200
                        data = json.loads(response.data)
                        assert data["pending_reports"] == 5
                        assert data["total_reports"] == 10

    def test_unauthorized_access(self):
        """Test that unauthorized access is blocked."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Test without authentication
                response = client.get("/admin/reports/queue")
                assert response.status_code == 401

                response = client.delete("/admin/posts/123")
                assert response.status_code == 401

                response = client.post("/admin/reports/123/dismiss", json={})
                assert response.status_code == 401

    def test_csrf_protection(self):
        """Test that CSRF protection is enforced."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request but no CSRF token
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    # Test POST without CSRF token
                    response = client.post(
                        "/admin/reports/123/dismiss",
                        json={"note": "test"},
                        content_type="application/json",
                    )

                    # Should be blocked by CSRF protection
                    assert response.status_code == 403

    def test_rate_limiting(self):
        """Test that rate limiting is enforced."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock rate limit exceeded
                with patch(
                    "app.admin.auth_service.AuthService.verify_mfa",
                    side_effect=Exception("Rate limit exceeded"),
                ):
                    login_data = {
                        "admin_id": "admin-1",
                        "password": "test_password",
                        "mfa_code": "123456",
                    }

                    response = client.post(
                        "/admin/login", json=login_data, content_type="application/json"
                    )

                    assert response.status_code == 429

    def test_content_validation_endpoint(self):
        """Test content validation endpoint."""
        app = get_test_app()
        with app.test_client() as client:
            with app.app_context():
                db.create_all()

                # Mock authenticated request
                with patch(
                    "app.admin.auth_service.AuthService.validate_access_token",
                    return_value={"sub": "admin-1", "typ": "access"},
                ):
                    # Test validating content
                    content_data = {"content": "This is test content"}
                    response = client.post(
                        "/admin/validate-content",
                        json=content_data,
                        content_type="application/json",
                    )

                    assert response.status_code == 200
                    data = json.loads(response.data)
                    assert "is_flagged" in data
                    assert "reasons" in data
