"""
Security middleware for admin portal.

This module provides CSRF protection, authentication middleware,
and other security-related middleware functions.
"""

import os
from flask import request, abort, current_app
from functools import wraps

from app.admin.auth_service import AuthService, AuthError


SAFE_METHODS = {"GET", "HEAD", "OPTIONS"}


def verify_csrf(f):
    """Decorator to verify CSRF token for unsafe methods."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip CSRF verification for safe methods
        if request.method in SAFE_METHODS:
            return f(*args, **kwargs)

        # Get CSRF tokens from header and cookie
        header_token = request.headers.get(AuthService.CSRF_HEADER_NAME)
        cookie_token = request.cookies.get(AuthService.CSRF_COOKIE_NAME)

        # Verify tokens match
        if not header_token or not cookie_token or header_token != cookie_token:
            abort(403)

        return f(*args, **kwargs)

    return decorated_function


def require_auth(f):
    """Decorator to require valid JWT authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get access token from cookie
        access_token = request.cookies.get("access_token")

        if not access_token:
            abort(401)

        # Validate token
        try:
            payload = AuthService.validate_access_token(access_token)
            if not payload:
                abort(401)

            # Add admin info to request context
            # Use g (flask global) instead of request for custom attributes
            from flask import g

            g.admin_id = payload["sub"]
            g.admin_payload = payload

            return f(*args, **kwargs)
        except AuthError:
            abort(401)

    return decorated_function


def rate_limit(key_prefix, limit=5, window=300):
    """Decorator to apply rate limiting."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Simple in-memory rate limiting for now
            # In production, use Redis or database-backed rate limiting

            # Get client identifier
            client_id = _get_client_identifier()
            rate_key = f"{key_prefix}:{client_id}"

            # Check if rate limit exceeded (placeholder implementation)
            if _is_rate_limited(rate_key, limit, window):
                abort(429)

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def require_feature_flag(feature_name):
    """Decorator to require specific feature flag to be enabled."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if feature is enabled
            if not _is_feature_enabled(feature_name):
                abort(404)  # Not found - feature disabled
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def validate_content_type(f):
    """Decorator to validate request content type."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # For POST/PUT requests, require JSON content type
        if request.method in ["POST", "PUT"]:
            content_type = request.content_type or ""
            if "application/json" not in content_type:
                abort(400)
        return f(*args, **kwargs)

    return decorated_function


def log_admin_action(f):
    """Decorator to log admin actions for audit trail."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Log the action attempt
        from flask import g

        admin_id = getattr(g, "admin_id", "unknown")
        endpoint = request.endpoint or "unknown"
        method = request.method

        # TODO: Implement proper logging
        # For now, just proceed with the request
        try:
            return f(*args, **kwargs)
        except Exception as e:
            # Log failed action
            current_app.logger.error(
                f"Admin action failed: {admin_id} {method} {endpoint} - {str(e)}"
            )
            raise

    return decorated_function


def _get_client_identifier():
    """Get client identifier for rate limiting."""
    # Use IP address for rate limiting (privacy-first approach)
    # In production, consider using hashed IP or other non-PII identifiers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Use first IP in forwarded chain
        return forwarded_for.split(",")[0].strip()
    else:
        return request.remote_addr or "unknown"


def _is_rate_limited(rate_key, limit, window):
    """Check if rate limit is exceeded (placeholder implementation)."""
    # Simple in-memory rate limiting
    # In production, use Redis or database

    # For now, always allow requests
    # TODO: Implement proper rate limiting with Redis
    return False


def _is_feature_enabled(feature_name):
    """Check if a feature flag is enabled."""
    # Check environment variable for feature flag
    env_var = f"ENABLE_{feature_name.upper()}"
    return os.environ.get(env_var, "0") == "1"


def add_security_headers(response):
    """Add security headers to response."""
    # Add security headers
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"

    # Add CSP header if in production
    if not current_app.config.get("TESTING", False):
        csp = (
            "default-src 'self'; "
            "script-src 'self' 'unsafe-inline'; "
            "style-src 'self' 'unsafe-inline' https://cdnjs.cloudflare.com; "
            "img-src 'self' data:; "
            "font-src 'self' https://cdnjs.cloudflare.com; "
            "connect-src 'self'; "
            "frame-ancestors 'none';"
        )
        response.headers["Content-Security-Policy"] = csp

    return response


def validate_admin_session(f):
    """Decorator to validate admin session is still active."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        from flask import g

        admin_id = getattr(g, "admin_id", None)

        if not admin_id:
            abort(401)

        # TODO: Implement session validation against database
        # For now, just check if admin_id exists
        return f(*args, **kwargs)

    return decorated_function


def enforce_https(f):
    """Decorator to enforce HTTPS in production."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip HTTPS check in testing
        if current_app.config.get("TESTING", False):
            return f(*args, **kwargs)

        # Enforce HTTPS in production
        if not request.is_secure:
            abort(426)  # Upgrade Required
        return f(*args, **kwargs)

    return decorated_function
