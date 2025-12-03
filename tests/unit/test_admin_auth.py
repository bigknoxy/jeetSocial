"""
Unit tests for admin authentication service following TDD approach.
Tests are written to fail first, then implementation will make them pass.
"""

import pytest
import jwt  # PyJWT provides jwt module
import time
from unittest.mock import patch

# Import app creation function
from app import create_app, db


def get_test_app():
    """Helper to get Flask app from create_app result."""
    app_result = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    return app_result[0] if isinstance(app_result, tuple) else app_result


class TestAuthService:
    """Test AuthService functionality."""

    def test_jwt_token_generation_with_exp_and_jti(self):
        """Test that JWT tokens contain proper expiration and jti claims."""
        from app.admin.auth_service import AuthService
        import json

        app = get_test_app()
        with app.app_context():
            with app.test_request_context():
                db.create_all()

                # Generate tokens
                response = AuthService.issue_login_tokens("admin-1")

                # Get JSON data from response
                response_data = json.loads(response.get_data(as_text=True))
                access_token = response_data["access_token"]
                refresh_token = response_data["refresh_token"]

                # Decode tokens to verify structure
                access_decoded = jwt.decode(
                    access_token, app.config["SECRET_KEY"], algorithms=["HS256"]
                )
                refresh_decoded = jwt.decode(
                    refresh_token, app.config["SECRET_KEY"], algorithms=["HS256"]
                )

                # Verify required claims
                assert "exp" in access_decoded
                assert "jti" in access_decoded
                assert "sub" in access_decoded
                assert "typ" in access_decoded
                assert access_decoded["sub"] == "admin-1"
                assert access_decoded["typ"] == "access"

                # Verify refresh token structure
                assert "exp" in refresh_decoded
                assert "jti" in refresh_decoded
                assert "sub" in refresh_decoded
                assert "typ" in refresh_decoded
                assert refresh_decoded["sub"] == "admin-1"
                assert refresh_decoded["typ"] == "refresh"

    def test_httpOnly_cookie_flags_and_samesite_strict(self):
        """Test that cookies are set with proper security flags."""
        from app.admin.auth_service import AuthService

        app = get_test_app()
        with app.test_request_context():
            db.create_all()

            # Issue tokens and get response
            response = AuthService.issue_login_tokens("admin-1")

            # Check cookie headers
            cookie_headers = response.headers.getlist("Set-Cookie")

            # Verify access token cookie
            access_cookie = None
            refresh_cookie = None
            csrf_cookie = None

            for cookie in cookie_headers:
                if "access_token=" in cookie:
                    access_cookie = cookie
                elif "refresh_token=" in cookie:
                    refresh_cookie = cookie
                elif "csrf_token=" in cookie:
                    csrf_cookie = cookie

            # Verify httpOnly, Secure, and SameSite flags
            assert access_cookie is not None
            assert "HttpOnly" in access_cookie
            assert "Secure" in access_cookie
            assert "SameSite=Strict" in access_cookie

            assert refresh_cookie is not None
            assert "HttpOnly" in refresh_cookie
            assert "Secure" in refresh_cookie
            assert "SameSite=Strict" in refresh_cookie

            # CSRF token should not be httpOnly
            assert csrf_cookie is not None
            assert "HttpOnly" not in csrf_cookie
            assert "Secure" in csrf_cookie
            assert "SameSite=Strict" in csrf_cookie

    def test_refresh_token_rotation_and_blacklist(self):
        (
            """Test that refresh tokens are properly rotated and old tokens are """
            """blacklisted."""
        )
        from app.admin.auth_service import AuthService
        from app.models import AdminSession

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Initial login
            tokens1 = AuthService.issue_login_tokens("admin-1")
            initial_refresh_jti = AuthService._extract_jti(tokens1["refresh_token"])

            # Verify session created
            session = AdminSession.query.filter_by(
                refresh_jti=initial_refresh_jti
            ).first()
            assert session is not None
            assert session.revoked is False

            # Refresh tokens
            with patch("flask.request") as mock_request:
                mock_request.cookies = {
                    "refresh_token": tokens1["refresh_token"],
                    "csrf_token": tokens1["csrf_token"],
                }
                mock_request.headers = {"X-CSRF-Token": tokens1["csrf_token"]}

                tokens2 = AuthService.refresh_access_token()

            # Verify new refresh token issued
            new_refresh_jti = AuthService._extract_jti(tokens2["refresh_token"])
            assert new_refresh_jti != initial_refresh_jti

            # Verify old session is revoked
            old_session = AdminSession.query.filter_by(
                refresh_jti=initial_refresh_jti
            ).first()
            assert old_session.revoked is True

            # Verify new session created
            new_session = AdminSession.query.filter_by(
                refresh_jti=new_refresh_jti
            ).first()
            assert new_session is not None
            assert new_session.revoked is False

    def test_validate_access_token(self):
        """Test access token validation."""
        from app.admin.auth_service import AuthService

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Generate valid token
            tokens = AuthService.issue_login_tokens("admin-1")
            valid_token = tokens["access_token"]

            # Validate valid token
            payload = AuthService.validate_access_token(valid_token)
            assert payload is not None
            assert payload["sub"] == "admin-1"
            assert payload["typ"] == "access"

            # Test invalid token
            invalid_payload = AuthService.validate_access_token("invalid.token.here")
            assert invalid_payload is None

            # Test expired token
            with patch("time.time") as mock_time:
                # Fast forward time beyond token expiry
                mock_time.return_value = time.time() + 3600  # 1 hour in future

                expired_payload = AuthService.validate_access_token(valid_token)
                assert expired_payload is None

    def test_device_fingerprint_generation(self):
        """Test device fingerprint generation for session security."""
        from app.admin.auth_service import AuthService

        app = get_test_app()
        with app.test_request_context(
            headers={
                "User-Agent": "Mozilla/5.0 (Test Browser)",
                "Accept-Language": "en-US,en;q=0.9",
            }
        ):
            # Generate fingerprint
            fingerprint1 = AuthService._generate_device_fingerprint()

            # Same request should generate same fingerprint
            fingerprint2 = AuthService._generate_device_fingerprint()
            assert fingerprint1 == fingerprint2

            # Different user agent should generate different fingerprint
            with app.test_request_context(
                headers={
                    "User-Agent": "Different Browser",
                    "Accept-Language": "en-US,en;q=0.9",
                }
            ):
                fingerprint3 = AuthService._generate_device_fingerprint()
                assert fingerprint3 != fingerprint1

            # Verify fingerprint is SHA-256 hash (64 hex chars)
            assert len(fingerprint1) == 64
            assert all(c in "0123456789abcdef" for c in fingerprint1)

    def test_logout_and_session_revocation(self):
        """Test logout functionality and session revocation."""
        from app.admin.auth_service import AuthService
        from app.models import AdminSession

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Login and create session
            tokens = AuthService.issue_login_tokens("admin-1")
            refresh_jti = AuthService._extract_jti(tokens["refresh_token"])

            # Verify session exists
            session = AdminSession.query.filter_by(refresh_jti=refresh_jti).first()
            assert session is not None
            assert session.revoked is False

            # Logout
            with patch("flask.request") as mock_request:
                mock_request.cookies = {"refresh_token": tokens["refresh_token"]}

                response = AuthService.logout()

            # Verify session is revoked
            session = AdminSession.query.filter_by(refresh_jti=refresh_jti).first()
            assert session.revoked is True

            # Verify cookies are cleared
            cookie_headers = response.headers.get_list("Set-Cookie")
            cleared_cookies = [c for c in cookie_headers if "Max-Age=0" in c]
            assert len(cleared_cookies) >= 2  # access_token and refresh_token

    def test_csrf_token_generation_and_validation(self):
        """Test CSRF token generation and validation."""
        from app.admin.auth_service import AuthService

        app = get_test_app()
        with app.test_request_context():
            # Generate CSRF token
            csrf_token = AuthService._generate_csrf_token()

            # Verify token format (URL-safe base64, typically 32 chars for 24 bytes)
            assert len(csrf_token) == 32
            assert csrf_token.replace("-", "").replace("_", "").isalnum()

            # Test validation
            assert AuthService._validate_csrf_token(csrf_token, csrf_token) is True
            assert (
                AuthService._validate_csrf_token(csrf_token, "different_token") is False
            )
            assert AuthService._validate_csrf_token(None, csrf_token) is False
            assert AuthService._validate_csrf_token(csrf_token, None) is False

    def test_rate_limiting_enforcement(self):
        """Test that authentication endpoints are rate limited."""
        from app.admin.auth_service import AuthService, AuthError

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Mock rate limiter
            with patch(
                "app.admin.auth_service AuthService._check_rate_limit"
            ) as mock_check:
                # First call should pass
                mock_check.return_value = True
        try:
            AuthService.issue_login_tokens("admin-1")
        except Exception:
            pytest.fail("Should not raise AuthError on first call")

            # Subsequent calls should be limited
            mock_check.return_value = False
            with pytest.raises(AuthError) as exc_info:
                AuthService.issue_login_tokens("admin-1")

            assert "Rate limit exceeded" in str(exc_info.value)

    def test_mfa_verification_integration(self):
        """Test MFA verification integration with auth service."""
        from app.admin.auth_service import AuthService, AuthError

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Mock MFA service
            with patch("app.admin.auth_service.MFAService") as mock_mfa:
                # Test successful MFA verification
                mock_mfa.verify_totp.return_value = True

                result = AuthService.verify_mfa("admin-1", "123456")
                assert result is True

                # Test failed MFA verification
                mock_mfa.verify_totp.return_value = False

                with pytest.raises(AuthError) as exc_info:
                    AuthService.verify_mfa("admin-1", "wrong_code")

                assert "Invalid MFA code" in str(exc_info.value)

    def test_admin_session_cleanup_expired_sessions(self):
        """Test cleanup of expired admin sessions."""
        from app.admin.auth_service import AuthService
        from app.models import AdminSession
        from datetime import datetime, timedelta

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create expired session
            expired_time = datetime.utcnow() - timedelta(hours=1)
            expired_session = AdminSession(
                refresh_jti="expired_jti",
                admin_id="admin-1",
                issued_at=datetime.utcnow() - timedelta(hours=2),
                expires_at=expired_time,
                revoked=False,
            )
            db.session.add(expired_session)

            # Create valid session
            valid_time = datetime.utcnow() + timedelta(hours=1)
            valid_session = AdminSession(
                refresh_jti="valid_jti",
                admin_id="admin-1",
                issued_at=datetime.utcnow(),
                expires_at=valid_time,
                revoked=False,
            )
            db.session.add(valid_session)
            db.session.commit()

            # Run cleanup
            cleaned_count = AuthService.cleanup_expired_sessions()

            # Verify expired session removed, valid session remains
            assert cleaned_count == 1
            assert (
                AdminSession.query.filter_by(refresh_jti="expired_jti").first() is None
            )
            assert (
                AdminSession.query.filter_by(refresh_jti="valid_jti").first()
                is not None
            )
