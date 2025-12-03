"""
Access control decorators for admin portal.

This module provides decorators for role-based access control,
rate limiting, and other access control functions.
"""

import os
from functools import wraps
from flask import request, jsonify

from app.admin.auth_service import AuthService, AuthError


def admin_required(f):
    """Decorator to require admin authentication."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get access token from cookie
        access_token = request.cookies.get("access_token")

        if not access_token:
            return jsonify({"error": "Authentication required"}), 401

        # Validate token
        try:
            payload = AuthService.validate_access_token(access_token)
            if not payload:
                return jsonify({"error": "Invalid or expired token"}), 401

            # Add admin info to request context
            from flask import g

            g.admin_id = payload["sub"]
            g.admin_payload = payload

            return f(*args, **kwargs)
        except AuthError:
            return jsonify({"error": "Authentication failed"}), 401

    return decorated_function


def csrf_protected(f):
    """Decorator to require CSRF protection for unsafe methods."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Skip CSRF verification for safe methods
        if request.method in ["GET", "HEAD", "OPTIONS"]:
            return f(*args, **kwargs)

        # Get CSRF tokens from header and cookie
        header_token = request.headers.get(AuthService.CSRF_HEADER_NAME)
        cookie_token = request.cookies.get(AuthService.CSRF_COOKIE_NAME)

        # Verify tokens match
        if not header_token or not cookie_token or header_token != cookie_token:
            return jsonify({"error": "CSRF token mismatch"}), 403

        return f(*args, **kwargs)

    return decorated_function


def rate_limit(key, limit=5, window=300):
    """Decorator to apply rate limiting."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get client identifier
            client_id = _get_client_id()
            rate_key = f"{key}:{client_id}"

            # Check if rate limit exceeded
            if _check_rate_limit(rate_key, limit, window):
                return jsonify(
                    {"error": "Rate limit exceeded", "retry_after": window}
                ), 429

            # Record this request
            _record_request(rate_key, window)

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def feature_flag_required(flag_name):
    """Decorator to require specific feature flag to be enabled."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check if feature is enabled
            if not _is_feature_enabled(flag_name):
                return jsonify({"error": "Feature not available"}), 403
            return f(*args, **kwargs)

        return decorated_function

    return decorator


def permission_required(permission):
    """Decorator to require specific admin permission."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Get admin ID from request
            from flask import g

            admin_id = getattr(g, "admin_id", None)

            if not admin_id:
                return jsonify({"error": "Authentication required"}), 401

            # Check if admin has required permission
            if not _has_permission(admin_id, permission):
                return jsonify({"error": "Insufficient permissions"}), 403

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def validate_json(f):
    """Decorator to validate JSON request body."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # For POST/PUT requests, require valid JSON
        if request.method in ["POST", "PUT"]:
            if not request.is_json:
                return jsonify({"error": "Invalid JSON"}), 400

            try:
                # Try to parse JSON to ensure it's valid
                data = request.get_json()
                if data is None:
                    return jsonify({"error": "Empty JSON body"}), 400
            except Exception:
                return jsonify({"error": "Invalid JSON format"}), 400

        return f(*args, **kwargs)

    return decorated_function


def require_mfa(f):
    """Decorator to require MFA verification."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Check if MFA is required for this admin
        from flask import g

        admin_id = getattr(g, "admin_id", None)

        if not admin_id:
            return jsonify({"error": "Authentication required"}), 401

        # Check if MFA is required globally
        if os.environ.get("ADMIN_REQUIRE_MFA", "1") == "1":
            # TODO: Implement per-admin MFA status checking
            # For now, assume MFA is required for all admins
            pass

        return f(*args, **kwargs)

    return decorated_function


def audit_action(action_type):
    """Decorator to audit admin actions."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            from flask import g

            admin_id = getattr(g, "admin_id", "unknown")

            # Log action attempt
            try:
                result = f(*args, **kwargs)

                # Log successful action
                _log_admin_action(
                    admin_id,
                    action_type,
                    {
                        "endpoint": request.endpoint,
                        "method": request.method,
                        "args": args,
                        "kwargs": kwargs,
                        "success": True,
                    },
                )

                return result
            except Exception as e:
                # Log failed action
                _log_admin_action(
                    admin_id,
                    action_type,
                    {
                        "endpoint": request.endpoint,
                        "method": request.method,
                        "args": args,
                        "kwargs": kwargs,
                        "success": False,
                        "error": str(e),
                    },
                )
                raise

        return decorated_function

    return decorator


def validate_content_length(max_length=280):
    """Decorator to validate content length."""

    def decorator(f):
        @wraps(f)
        def decorated_function(*args, **kwargs):
            # Check content length for POST requests
            if request.method == "POST" and request.is_json:
                data = request.get_json()

                # Check for content field
                if "content" in data:
                    content = data["content"]
                    if len(content) > max_length:
                        error_msg = f"Content too long (max {max_length} characters)"
                        return jsonify(
                            {
                                "error": error_msg,
                                "max_length": max_length,
                                "actual_length": len(content),
                            }
                        ), 400

                # Check for message field
                elif "message" in data:
                    message = data["message"]
                    if len(message) > max_length:
                        error_msg = f"Message too long (max {max_length} characters)"
                        error_msg = f"Message too long (max {max_length} characters)"
                        return jsonify(
                            {
                                "error": error_msg,
                                "max_length": max_length,
                                "actual_length": len(message),
                            }
                        ), 400

            return f(*args, **kwargs)

        return decorated_function

    return decorator


def _get_client_id():
    """Get client identifier for rate limiting."""
    # Use IP address for rate limiting (privacy-first approach)
    # In production, consider using hashed IP or other non-PII identifiers
    forwarded_for = request.headers.get("X-Forwarded-For")
    if forwarded_for:
        # Use first IP in forwarded chain
        return forwarded_for.split(",")[0].strip()
    else:
        return request.remote_addr or "unknown"


def _check_rate_limit(rate_key, limit, window):
    """Check if rate limit is exceeded (placeholder implementation)."""
    # Simple in-memory rate limiting
    # In production, use Redis or database-backed rate limiting

    # For now, always allow requests
    # TODO: Implement proper rate limiting with Redis
    return False


def _record_request(rate_key, window):
    """Record a request for rate limiting (placeholder implementation)."""
    # TODO: Implement proper rate limiting with Redis
    pass


def _is_feature_enabled(feature_name):
    """Check if a feature flag is enabled."""
    # Check environment variable for feature flag
    env_var = f"ENABLE_{feature_name.upper()}"
    return os.environ.get(env_var, "0") == "1"


def _has_permission(admin_id, permission):
    """Check if admin has specific permission (placeholder implementation)."""
    # TODO: Implement proper permission system
    # For now, grant all permissions to authenticated admins
    return True


def _log_admin_action(admin_id, action_type, details):
    """Log admin action to audit trail (placeholder implementation)."""
    # TODO: Implement proper audit logging
    # For now, just pass
    pass
