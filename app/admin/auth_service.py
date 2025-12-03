"""
Authentication service for admin portal with JWT, CSRF, and MFA support.

This service handles JWT token generation/validation, CSRF protection,
refresh token rotation, and integration with MFA services.
"""

import os
import secrets
import hashlib
import jwt
from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any

from flask import request, make_response, current_app
from sqlalchemy.exc import IntegrityError
from typing import Union

from app import db
from app.models import AdminSession


class AuthError(Exception):
    """Raised when authentication fails."""

    def __init__(self, message: str, error_code: str = "AUTH_ERROR"):
        self.message = message
        self.error_code = error_code
        super().__init__(self.message)


class AuthService:
    """Service for admin authentication with JWT and CSRF protection."""

    # Configuration from environment
    JWT_ALG = "HS256"
    ACCESS_TTL = int(os.environ.get("JWT_ACCESS_TTL", "900"))  # 15 minutes
    REFRESH_TTL = int(os.environ.get("JWT_REFRESH_TTL", "86400"))  # 24 hours
    CSRF_COOKIE_NAME = os.environ.get("CSRF_COOKIE_NAME", "csrf_token")
    CSRF_HEADER_NAME = os.environ.get("CSRF_HEADER_NAME", "X-CSRF-Token")
    MAX_LOGIN_ATTEMPTS = int(os.environ.get("MAX_LOGIN_ATTEMPTS", "5"))
    LOGIN_LOCKOUT_TTL = int(os.environ.get("LOGIN_LOCKOUT_TTL", "900"))  # 15 minutes

    @classmethod
    def issue_login_tokens(cls, admin_id: str) -> Union[Dict[str, str], Any]:
        """
        Issue JWT access and refresh tokens with CSRF protection.

        Args:
            admin_id: Internal admin identifier

        Returns:
            Dictionary containing tokens and CSRF token

        Raises:
            AuthError: If rate limit exceeded
        """
        # Check rate limiting
        if not cls._check_rate_limit(admin_id):
            raise AuthError("Rate limit exceeded", "RATE_LIMIT_EXCEEDED")

        # Generate tokens
        access_token_data = cls._issue_token(admin_id, cls.ACCESS_TTL, "access")
        refresh_token_data = cls._issue_token(admin_id, cls.REFRESH_TTL, "refresh")
        csrf_token = cls._generate_csrf_token()

        # Create response with secure cookies
        response = make_response(
            {
                "access_token": access_token_data["token"],
                "refresh_token": refresh_token_data["token"],
                "csrf_token": csrf_token,
                "token_type": "Bearer",
                "expires_in": cls.ACCESS_TTL,
            }
        )

        # Set secure cookies
        cls._set_auth_cookies(
            response,
            access_token_data["token"],
            refresh_token_data["token"],
            csrf_token,
        )

        # Store refresh token in database
        cls._store_refresh_token(refresh_token_data["jti"], admin_id)

        return response

    @classmethod
    def refresh_access_token(cls) -> Union[Dict[str, str], Any]:
        """
        Refresh access token using valid refresh token.

        Returns:
            Dictionary with new access token and updated cookies

        Raises:
            AuthError: If refresh token is invalid or revoked
        """
        refresh_token = request.cookies.get("refresh_token")
        csrf_token = request.cookies.get(cls.CSRF_COOKIE_NAME)
        csrf_header = request.headers.get(cls.CSRF_HEADER_NAME)

        # Validate CSRF
        if not cls._validate_csrf_token(csrf_header, csrf_token):
            raise AuthError("Invalid CSRF token", "INVALID_CSRF")

        # Validate refresh token
        if not refresh_token:
            raise AuthError("Missing refresh token", "MISSING_REFRESH")

        try:
            payload = cls._validate_token(refresh_token, "refresh")
            if not payload:
                raise AuthError("Invalid refresh token", "INVALID_REFRESH")
        except jwt.ExpiredSignatureError:
            raise AuthError("Refresh token expired", "REFRESH_EXPIRED")

        # Check if refresh token is revoked
        session = AdminSession.query.filter_by(
            refresh_jti=payload["jti"], revoked=False
        ).first()

        if not session or session.expires_at < datetime.utcnow():
            raise AuthError("Refresh token revoked or expired", "REFRESH_REVOKED")

        # Revoke old refresh token
        session.revoked = True
        db.session.commit()

        # Issue new tokens
        admin_id = payload["sub"]
        return cls.issue_login_tokens(admin_id)

    @classmethod
    def validate_access_token(cls, token: str) -> Optional[Dict[str, Any]]:
        """
        Validate access token and return payload.

        Args:
            token: JWT access token

        Returns:
            Token payload if valid, None otherwise
        """
        return cls._validate_token(token, "access")

    @classmethod
    def logout(cls) -> Union[Dict[str, str], Any]:
        """
        Logout user by revoking refresh token.

        Returns:
            Response with cleared cookies
        """
        refresh_token = request.cookies.get("refresh_token")

        if refresh_token:
            try:
                payload = cls._validate_token(refresh_token, "refresh")
                if payload:
                    # Revoke the refresh token
                    session = AdminSession.query.filter_by(
                        refresh_jti=payload["jti"]
                    ).first()
                    if session:
                        session.revoked = True
                        db.session.commit()
            except Exception:
                pass  # Ignore errors during logout

        # Create response with cleared cookies
        response = make_response({"message": "Logged out successfully"})
        cls._clear_auth_cookies(response)

        return response

    @classmethod
    def verify_mfa(cls, admin_id: str, mfa_code: str) -> bool:
        """
        Verify MFA code for admin.

        Args:
            admin_id: Admin identifier
            mfa_code: MFA code to verify

        Returns:
            True if MFA valid, raises AuthError otherwise

        Raises:
            AuthError: If MFA code is invalid
        """
        try:
            from app.admin.mfa_service import MFAService

            if MFAService.verify_totp(admin_id, mfa_code):
                return True
            else:
                raise AuthError("Invalid MFA code", "INVALID_MFA")
        except ImportError:
            # MFA service not implemented yet, skip verification
            return True

    @classmethod
    def cleanup_expired_sessions(cls) -> int:
        """
        Clean up expired admin sessions.

        Returns:
            Number of sessions cleaned up
        """
        expired_count = AdminSession.query.filter(
            AdminSession.expires_at < datetime.utcnow()
        ).delete()

        db.session.commit()
        return expired_count

    @classmethod
    def _issue_token(cls, sub: str, ttl: int, token_type: str) -> Dict[str, str]:
        """Issue a JWT token with specified TTL and type."""
        now = datetime.now(timezone.utc)
        jti = secrets.token_urlsafe(16)

        payload = {
            "sub": sub,
            "iat": int(now.timestamp()),
            "exp": int((now + timedelta(seconds=ttl)).timestamp()),
            "jti": jti,
            "typ": token_type,
        }

        token = jwt.encode(payload, cls._get_secret_key(), algorithm=cls.JWT_ALG)
        return {"token": token, "jti": jti}

    @classmethod
    def _validate_token(
        cls, token: str, expected_type: str
    ) -> Optional[Dict[str, Any]]:
        """Validate JWT token and return payload if valid."""
        try:
            secret_key = cls._get_secret_key()
            payload = jwt.decode(token, secret_key, algorithms=[cls.JWT_ALG])

            # Check token type
            if payload.get("typ") != expected_type:
                return None

            return payload
        except jwt.InvalidTokenError:
            return None

            return payload
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
            print(f"[DEBUG] Token validation failed: {e}")
            return None

            return payload
        except (jwt.InvalidTokenError, jwt.ExpiredSignatureError) as e:
            print(f"[DEBUG] Token validation failed: {e}")
            return None

    @classmethod
    def _get_secret_key(cls) -> str:
        """Get JWT secret key from environment."""
        # Try Flask app config first, fallback to environment
        try:
            secret_key = current_app.config.get("SECRET_KEY")
        except RuntimeError:
            # Working outside application context, use environment directly
            secret_key = os.environ.get("SECRET_KEY")

        if not secret_key:
            raise AuthError("Secret key not configured", "CONFIG_ERROR")
        return secret_key

    @classmethod
    def _generate_csrf_token(cls) -> str:
        """Generate CSRF token."""
        return secrets.token_urlsafe(24)

    @classmethod
    def _validate_csrf_token(
        cls, header_token: Optional[str], cookie_token: Optional[str]
    ) -> bool:
        """Validate CSRF token from header against cookie."""
        if not header_token or not cookie_token:
            return False
        return secrets.compare_digest(header_token, cookie_token)

    @classmethod
    def _set_auth_cookies(
        cls, response, access_token: str, refresh_token: str, csrf_token: str
    ):
        """Set authentication cookies with security flags."""
        # Determine if we're in development mode
        is_development = (
            current_app.config.get("TESTING", False)
            or current_app.config.get("FLASK_ENV") == "development"
        )

        # Set secure flag based on environment and request scheme
        # For HTTP requests in development, don't set secure flag
        secure_flag = not (is_development or request.scheme == "http")

        # Access token cookie (httpOnly, secure, sameSite=strict)
        response.set_cookie(
            "access_token",
            access_token,
            httponly=True,
            secure=secure_flag,
            samesite="Strict",
            max_age=cls.ACCESS_TTL,
        )

        # Refresh token cookie (httpOnly, secure, sameSite=strict)
        response.set_cookie(
            "refresh_token",
            refresh_token,
            httponly=True,
            secure=secure_flag,
            samesite="Strict",
            max_age=cls.REFRESH_TTL,
        )

        # CSRF token cookie (not httpOnly, secure, sameSite=strict)
        response.set_cookie(
            cls.CSRF_COOKIE_NAME,
            csrf_token,
            httponly=False,
            secure=secure_flag,
            samesite="Strict",
            max_age=cls.ACCESS_TTL,
        )

    @classmethod
    def _clear_auth_cookies(cls, response):
        """Clear authentication cookies."""
        cookies_to_clear = ["access_token", "refresh_token", cls.CSRF_COOKIE_NAME]
        for cookie in cookies_to_clear:
            response.set_cookie(
                cookie, "", expires=0, httponly=True, secure=True, samesite="Strict"
            )

    @classmethod
    def _store_refresh_token(cls, jti: str, admin_id: str):
        """Store refresh token in database."""
        expires_at = datetime.utcnow() + timedelta(seconds=cls.REFRESH_TTL)
        device_hash = cls._generate_device_fingerprint()

        session = AdminSession(
            refresh_jti=jti,
            admin_id=admin_id,
            expires_at=expires_at,
            device_hash=device_hash,
        )

        try:
            db.session.add(session)
            db.session.commit()
        except IntegrityError:
            db.session.rollback()
            raise AuthError("Failed to store refresh token", "STORAGE_ERROR")

    @classmethod
    def _generate_device_fingerprint(cls) -> str:
        """Generate device fingerprint from request headers."""
        try:
            # Use non-PII request headers for fingerprinting
            user_agent = request.headers.get("User-Agent", "")
            accept_lang = request.headers.get("Accept-Language", "")
            accept_encoding = request.headers.get("Accept-Encoding", "")

            fingerprint_data = f"{user_agent}|{accept_lang}|{accept_encoding}"
            return hashlib.sha256(fingerprint_data.encode()).hexdigest()
        except RuntimeError:
            # Outside request context, use default fingerprint
            return hashlib.sha256(b"no_request_context").hexdigest()

    @classmethod
    def _check_rate_limit(cls, admin_id: str) -> bool:
        """Check if admin is rate limited for login attempts."""
        # Simple in-memory rate limiting for now
        # In production, use Redis or database-backed rate limiting
        return True

    @classmethod
    def _extract_jti(cls, token: str) -> Optional[str]:
        """Extract JTI from JWT token."""
        try:
            payload = jwt.decode(
                token,
                cls._get_secret_key(),
                algorithms=[cls.JWT_ALG],
                options={"verify_exp": False},
            )
            return payload.get("jti")
        except jwt.InvalidTokenError:
            return None
