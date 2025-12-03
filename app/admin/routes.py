"""
Admin portal routes and API endpoints.

This module provides REST API endpoints for admin functionality
including authentication, moderation, and reporting features.
"""

import os
import secrets
from flask import Blueprint, request, jsonify, current_app, make_response
from functools import wraps

from app.admin.auth_service import AuthService, AuthError
from app.admin.moderation_service import ModerationService
from app.admin.report_service import ReportService
from app.admin.middleware import verify_csrf, require_auth, add_security_headers
from app.admin.decorators import rate_limit

# Create admin blueprint
admin_bp = Blueprint("admin_portal", __name__, url_prefix="/admin")


# Apply security headers to all admin responses
@admin_bp.after_request
def apply_admin_security_headers(response):
    """Apply security headers to all admin responses."""
    return add_security_headers(response)


def handle_auth_error(f):
    """Decorator to handle authentication errors."""

    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            return f(*args, **kwargs)
        except AuthError as e:
            return jsonify(
                {"error": e.message, "error_code": e.error_code}
            ), 401 if e.error_code.startswith("AUTH") else 403

    return decorated_function


@admin_bp.route("/", methods=["GET"])
@require_auth
def admin_dashboard():
    """Serve admin dashboard page."""
    return current_app.send_static_file("admin/dashboard.html")


@admin_bp.route("/login", methods=["GET"])
def admin_login_page():
    """Serve admin login page."""
    return current_app.send_static_file("admin/login.html")


@admin_bp.route("/login", methods=["POST"])
@rate_limit("admin-login", limit=5, window=900)  # 5 attempts per 15 minutes
@handle_auth_error
def admin_login():
    """Admin login endpoint with MFA support."""
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid JSON"}), 400

    admin_id = data.get("admin_id")
    password = data.get("password")
    mfa_code = data.get("mfa_code")

    # Validate required fields
    if not all([admin_id, password, mfa_code]):
        return jsonify(
            {
                "error": "Missing required fields",
                "required": ["admin_id", "password", "mfa_code"],
            }
        ), 400

    # Verify admin credentials against environment variables
    expected_admin_id = os.environ.get("ADMIN_ID")
    expected_password = os.environ.get("ADMIN_PASSWORD")

    if not expected_admin_id or not expected_password:
        return jsonify({"error": "Admin credentials not configured"}), 500

    if admin_id != expected_admin_id or password != expected_password:
        return jsonify({"error": "Invalid credentials"}), 401

    # Verify MFA
    if not AuthService.verify_mfa(admin_id, mfa_code):
        return jsonify({"error": "Invalid MFA code"}), 401

    # Issue tokens
    try:
        response = AuthService.issue_login_tokens(admin_id)
        return response
    except AuthError as e:
        return jsonify({"error": e.message}), 401


@admin_bp.route("/logout", methods=["POST"])
@require_auth
@verify_csrf
def admin_logout():
    """Admin logout endpoint."""
    try:
        response = AuthService.logout()
        return response
    except Exception:
        return jsonify({"error": "Logout failed"}), 500


@admin_bp.route("/csrf-token", methods=["GET"])
def get_csrf_token():
    """Get CSRF token for client-side requests."""
    csrf_token = secrets.token_urlsafe(32)
    response = make_response(jsonify({"csrf_token": csrf_token}))

    # Determine if we're in development mode
    is_development = (
        current_app.config.get("TESTING", False)
        or current_app.config.get("FLASK_ENV") == "development"
    )

    # Set secure flag based on environment
    secure_flag = not is_development

    response.set_cookie(
        "csrf_token",
        csrf_token,
        httponly=False,
        secure=secure_flag,
        samesite="Strict",
        max_age=3600,
    )
    return response


@admin_bp.route("/session-check", methods=["GET"])
def check_session():
    """Check if admin session is valid."""
    try:
        # Get access token from cookie
        access_token = request.cookies.get("access_token")

        if not access_token:
            return jsonify({"authenticated": False, "admin_id": None})

        # Validate token
        payload = AuthService.validate_access_token(access_token)
        if not payload:
            return jsonify({"authenticated": False, "admin_id": None})

        return jsonify({"authenticated": True, "admin_id": payload["sub"]})
    except Exception:
        return jsonify({"authenticated": False, "admin_id": None})


@admin_bp.route("/reports/queue", methods=["GET"])
@require_auth
def get_moderation_queue():
    """Get moderation queue with pending reports."""
    try:
        limit = min(int(request.args.get("limit", 50)), 100)  # Max 100 items
        queue = ModerationService.get_moderation_queue(limit=limit)
        return jsonify(queue)
    except Exception:
        return jsonify({"error": "Failed to get queue"}), 500


@admin_bp.route("/reports", methods=["GET"])
@require_auth
def get_reports():
    """Get reports filtered by status."""
    try:
        status = request.args.get("status", "pending")
        limit = min(int(request.args.get("limit", 100)), 200)  # Max 200 items

        reports = ReportService.get_reports_by_status(status, limit=limit)

        # Convert to JSON-serializable format
        reports_data = []
        for report in reports:
            report_data = {
                "id": report.id,
                "post_id": report.post_id,
                "reason": report.reason,
                "status": report.status,
                "created_at": report.created_at.isoformat()
                if report.created_at
                else None,
                "updated_at": report.updated_at.isoformat()
                if report.updated_at
                else None,
            }

            # Include post data if available
            if report.post:
                report_data["post"] = {
                    "id": report.post.id,
                    "username": report.post.username,
                    "message": report.post.message,
                    "timestamp": report.post.timestamp.isoformat()
                    if report.post.timestamp
                    else None,
                    "kindness_points": report.post.kindness_points,
                }

            reports_data.append(report_data)

        return jsonify(reports_data)
    except Exception:
        return jsonify({"error": "Failed to get reports"}), 500


@admin_bp.route("/posts/<int:post_id>", methods=["DELETE"])
@require_auth
@verify_csrf
def delete_post(post_id):
    """Delete a post."""
    try:
        reason = "Admin action"
        if request.is_json and request.json:
            reason = request.json.get("reason", "Admin action")

        # Get admin_id from request context (set by middleware)
        from flask import g

        admin_id = getattr(g, "admin_id", "unknown")

        success = ModerationService.delete_post(post_id, admin_id, reason)

        if success:
            return jsonify({"success": True, "message": "Post deleted"})
        else:
            return jsonify({"error": "Post not found"}), 404
    except Exception:
        return jsonify({"error": "Failed to delete post"}), 500


@admin_bp.route("/reports/<int:report_id>/dismiss", methods=["POST"])
@require_auth
@verify_csrf
def dismiss_report(report_id):
    """Dismiss a report."""
    try:
        data = request.get_json() or {}
        note = data.get("note", "Dismissed by admin")

        # Get admin_id from request context (set by middleware)
        from flask import g

        admin_id = getattr(g, "admin_id", "unknown")

        success = ModerationService.dismiss_report(report_id, admin_id, note)

        if success:
            return jsonify({"success": True, "message": "Report dismissed"})
        else:
            return jsonify({"error": "Report not found"}), 404
    except Exception:
        return jsonify({"error": "Failed to dismiss report"}), 500


@admin_bp.route("/bulk-action", methods=["POST"])
@require_auth
@verify_csrf
@rate_limit("admin-bulk", limit=10, window=3600)  # 10 bulk actions per hour
def bulk_action():
    """Perform bulk actions on posts or reports."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"error": "Invalid JSON"}), 400

        action = data.get("action")
        post_ids = data.get("post_ids", [])
        reason = data.get("reason", "Bulk admin action")

        if not action or not post_ids:
            return jsonify(
                {"error": "Missing required fields", "required": ["action", "post_ids"]}
            ), 400

        # Get admin_id from request context (set by middleware)
        from flask import g

        admin_id = getattr(g, "admin_id", "unknown")

        if action == "delete_posts":
            result = ModerationService.bulk_delete_posts(post_ids, admin_id, reason)
            return jsonify(result)
        else:
            return jsonify({"error": "Unsupported action"}), 400

    except Exception:
        return jsonify({"error": "Failed to perform bulk action"}), 500


@admin_bp.route("/stats", methods=["GET"])
@require_auth
def get_moderation_stats():
    """Get moderation statistics."""
    try:
        stats = ModerationService.get_moderation_stats()
        return jsonify(stats)
    except Exception:
        return jsonify({"error": "Failed to get stats"}), 500


@admin_bp.route("/validate-content", methods=["POST"])
@require_auth
def validate_content():
    """Validate content against hate speech filter."""
    try:
        data = request.get_json()
        if not data or "content" not in data:
            return jsonify({"error": "Content is required"}), 400

        content = data["content"]
        result = ModerationService.validate_content(content)

        return jsonify(result)
    except Exception:
        return jsonify({"error": "Failed to validate content"}), 500


@admin_bp.route("/refresh", methods=["POST"])
@verify_csrf
def refresh_token():
    """Refresh access token using refresh token."""
    try:
        response = AuthService.refresh_access_token()
        return response
    except AuthError as e:
        return jsonify({"error": e.message}), 401
    except Exception:
        return jsonify({"error": "Token refresh failed"}), 500


@admin_bp.route("/health", methods=["GET"])
def admin_health():
    """Admin portal health check."""
    return jsonify(
        {
            "status": "healthy",
            "version": "1.0.0",
            "features": {
                "mfa_enabled": os.environ.get("ADMIN_REQUIRE_MFA", "1") == "1",
                "csrf_protection": True,
                "rate_limiting": True,
            },
        }
    )


# Error handlers
@admin_bp.errorhandler(404)
def not_found(error):
    """Handle 404 errors."""
    return jsonify({"error": "Endpoint not found"}), 404


@admin_bp.errorhandler(405)
def method_not_allowed(error):
    """Handle 405 errors."""
    return jsonify({"error": "Method not allowed"}), 405


@admin_bp.errorhandler(429)
def rate_limit_exceeded(error):
    """Handle rate limit exceeded."""
    return jsonify(
        {
            "error": "Rate limit exceeded",
            "retry_after": getattr(error, "retry_after", 60),
        }
    ), 429


@admin_bp.errorhandler(500)
def internal_error(error):
    """Handle 500 errors."""
    return jsonify({"error": "Internal server error"}), 500
