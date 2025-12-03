"""
Admin utility functions and helpers.

This module provides utility functions for admin operations
including validation, formatting, and helper functions.
"""

import os
import json
from datetime import datetime
from typing import Dict, List, Any, Optional

from app import db
from app.models import AdminAction, AdminReport


def format_admin_action(action: AdminAction) -> Dict[str, Any]:
    """
    Format admin action for display.

    Args:
        action: AdminAction instance

    Returns:
        Dictionary with formatted action data
    """
    return {
        "id": action.id,
        "actor_id": action.actor_id,
        "action_type": action.action_type,
        "created_at": action.created_at.isoformat() if action.created_at else None,
        "payload": action.action_payload,
        "hash": action.curr_hash,
    }


def format_admin_report(
    report: AdminReport, include_post: bool = True
) -> Dict[str, Any]:
    """
    Format admin report for display.

    Args:
        report: AdminReport instance
        include_post: Whether to include post data

    Returns:
        Dictionary with formatted report data
    """
    report_data = {
        "id": report.id,
        "post_id": report.post_id,
        "reason": report.reason,
        "status": report.status,
        "created_at": report.created_at.isoformat() if report.created_at else None,
        "updated_at": report.updated_at.isoformat() if report.updated_at else None,
    }

    if include_post and report.post:
        report_data["post"] = {
            "id": report.post.id,
            "username": report.post.username,
            "message": report.post.message,
            "timestamp": report.post.timestamp.isoformat()
            if report.post.timestamp
            else None,
            "kindness_points": report.post.kindness_points,
        }

    return report_data


def validate_pagination_params(
    page: int = 1, limit: int = 50, max_limit: int = 200
) -> Dict[str, int]:
    """
    Validate and normalize pagination parameters.

    Args:
        page: Page number (default: 1)
        limit: Items per page (default: 50)
        max_limit: Maximum allowed limit (default: 200)

    Returns:
        Dictionary with validated pagination params
    """
    # Ensure page is at least 1
    page = max(1, int(page) if page else 1)

    # Ensure limit is within bounds
    limit = max(1, min(int(limit) if limit else 50, max_limit))

    # Calculate offset
    offset = (page - 1) * limit

    return {
        "page": page,
        "limit": limit,
        "offset": offset,
        "has_next": True,  # Will be updated by caller
        "has_prev": page > 1,
    }


def format_audit_log_for_export(actions: List[AdminAction]) -> str:
    """
    Format audit log entries for export.

    Args:
        actions: List of AdminAction instances

    Returns:
        JSON string formatted for export
    """
    export_data = []
    for action in actions:
        export_entry = {
            "id": action.id,
            "actor_id": action.actor_id,
            "action_type": action.action_type,
            "created_at": action.created_at.isoformat() if action.created_at else None,
            "payload": action.action_payload,
            "prev_hash": action.prev_hash,
            "curr_hash": action.curr_hash,
        }
        export_data.append(export_entry)

    return json.dumps(export_data, indent=2, default=str)


def calculate_admin_stats(
    start_date: Optional[datetime] = None, end_date: Optional[datetime] = None
) -> Dict[str, Any]:
    """
    Calculate admin statistics for a date range.

    Args:
        start_date: Start date for stats (optional)
        end_date: End date for stats (optional)

    Returns:
        Dictionary with admin statistics
    """
    query = AdminAction.query

    if start_date:
        query = query.filter(AdminAction.created_at >= start_date)

    if end_date:
        query = query.filter(AdminAction.created_at <= end_date)

    # Get total actions
    total_actions = query.count()

    # Get actions by type
    actions_by_type = (
        query.with_entities(AdminAction.action_type, db.func.count(AdminAction.id))
        .group_by(AdminAction.action_type)
        .all()
    )

    # Get actions by actor
    actions_by_actor = (
        query.with_entities(AdminAction.actor_id, db.func.count(AdminAction.id))
        .group_by(AdminAction.actor_id)
        .all()
    )

    # Get daily activity
    daily_activity = (
        query.with_entities(
            db.func.date(AdminAction.created_at).label("date"),
            db.func.count(AdminAction.id).label("count"),
        )
        .group_by(db.func.date(AdminAction.created_at))
        .order_by(db.func.date(AdminAction.created_at).desc())
        .limit(30)  # Last 30 days
        .all()
    )

    return {
        "total_actions": total_actions,
        "actions_by_type": {
            action_type: count for action_type, count in actions_by_type
        },
        "actions_by_actor": {actor_id: count for actor_id, count in actions_by_actor},
        "daily_activity": [
            {"date": str(date), "count": count} for date, count in daily_activity
        ],
        "period": {
            "start_date": start_date.isoformat() if start_date else None,
            "end_date": end_date.isoformat() if end_date else None,
        },
    }


def sanitize_search_query(query: str) -> str:
    """
    Sanitize search query for safe database queries.

    Args:
        query: Raw search query

    Returns:
        Sanitized query string
    """
    if not query:
        return ""

    # Remove potentially dangerous characters
    dangerous_chars = [
        ";",
        "--",
        "/*",
        "*/",
        "xp_",
        "union",
        "select",
        "insert",
        "update",
        "delete",
    ]

    sanitized = query.lower()
    for char in dangerous_chars:
        sanitized = sanitized.replace(char, "")

    # Limit length
    sanitized = sanitized[:100]

    return sanitized.strip()


def validate_admin_input(
    data: Dict[str, Any], required_fields: Optional[List[str]] = None
) -> Dict[str, Any]:
    """
    Validate and sanitize admin input data.

    Args:
        data: Input data dictionary
        required_fields: List of required field names

    Returns:
        Dictionary with validation results
    """
    errors = []
    sanitized = {}

    # Check required fields
    if required_fields:
        for field in required_fields:
            if field not in data or not data[field]:
                errors.append(f"Missing required field: {field}")

    # Sanitize string fields
    for key, value in data.items():
        if isinstance(value, str):
            # Basic sanitization
            sanitized_value = value.strip()[:1000]  # Limit length
            sanitized[key] = sanitized_value
        else:
            sanitized[key] = value

    return {"valid": len(errors) == 0, "errors": errors, "sanitized": sanitized}


def get_admin_session_info(admin_id: str) -> Dict[str, Any]:
    """
    Get admin session information.

    Args:
        admin_id: Admin identifier

    Returns:
        Dictionary with session information
    """
    from app.models import AdminSession

    # Get active sessions for admin
    active_sessions = (
        AdminSession.query.filter_by(admin_id=admin_id, revoked=False)
        .order_by(AdminSession.issued_at.desc())
        .all()
    )

    # Get total sessions count
    total_sessions = AdminSession.query.filter_by(admin_id=admin_id).count()

    # Format session data
    sessions_data = []
    for session in active_sessions:
        session_data = {
            "id": session.id,
            "issued_at": session.issued_at.isoformat() if session.issued_at else None,
            "expires_at": session.expires_at.isoformat()
            if session.expires_at
            else None,
            "device_hash": session.device_hash,
            "is_current": True,  # TODO: Implement current session detection
        }
        sessions_data.append(session_data)

    return {
        "admin_id": admin_id,
        "active_sessions": len(active_sessions),
        "total_sessions": total_sessions,
        "sessions": sessions_data,
    }


def export_admin_data(
    data_type: str,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
) -> Dict[str, Any]:
    """
    Export admin data in various formats.

    Args:
        data_type: Type of data to export ('audit', 'reports', 'stats')
        start_date: Start date for export (optional)
        end_date: End date for export (optional)

    Returns:
        Dictionary with export results
    """
    timestamp = datetime.utcnow().isoformat()

    if data_type == "audit":
        actions = AdminAction.query
        if start_date:
            actions = actions.filter(AdminAction.created_at >= start_date)
        if end_date:
            actions = actions.filter(AdminAction.created_at <= end_date)

        actions = actions.order_by(AdminAction.created_at.desc()).all()

        return {
            "type": "audit",
            "data": format_audit_log_for_export(actions),
            "filename": f"admin_audit_{timestamp}.json",
            "count": len(actions),
        }

    elif data_type == "reports":
        reports = AdminReport.query
        if start_date:
            reports = reports.filter(AdminReport.created_at >= start_date)
        if end_date:
            reports = reports.filter(AdminReport.created_at <= end_date)

        reports = reports.order_by(AdminReport.created_at.desc()).all()

        reports_data = [format_admin_report(report) for report in reports]

        return {
            "type": "reports",
            "data": json.dumps(reports_data, indent=2, default=str),
            "filename": f"admin_reports_{timestamp}.json",
            "count": len(reports_data),
        }

    elif data_type == "stats":
        stats = calculate_admin_stats(start_date, end_date)

        return {
            "type": "stats",
            "data": json.dumps(stats, indent=2, default=str),
            "filename": f"admin_stats_{timestamp}.json",
            "count": 1,
        }

    else:
        return {
            "type": "error",
            "error": f"Unknown export type: {data_type}",
            "filename": None,
            "count": 0,
        }


def check_admin_permissions(admin_id: str, permission: str) -> bool:
    """
    Check if admin has specific permission.

    Args:
        admin_id: Admin identifier
        permission: Permission to check

    Returns:
        True if admin has permission, False otherwise
    """
    # TODO: Implement proper permission system
    # For now, grant all permissions to authenticated admins
    # In production, this should check against a database or config
    return True


def get_feature_flags() -> Dict[str, bool]:
    """
    Get current feature flag settings.

    Returns:
        Dictionary with feature flag settings
    """
    return {
        "admin_portal": os.environ.get("ENABLE_ADMIN_PORTAL", "0") == "1",
        "mfa_required": os.environ.get("ADMIN_REQUIRE_MFA", "1") == "1",
        "rate_limiting": os.environ.get("ENABLE_RATE_LIMITING", "1") == "1",
        "audit_logging": True,  # Always enabled for security
        "csrf_protection": True,  # Always enabled for security
        "content_filtering": True,  # Always enabled for safety
    }


def format_file_size(size_bytes: int) -> str:
    """
    Format file size in human-readable format.

    Args:
        size_bytes: Size in bytes

    Returns:
        Human-readable file size string
    """
    if size_bytes == 0:
        return "0 B"

    size_names = ["B", "KB", "MB", "GB", "TB"]
    i = 0
    size = float(size_bytes)

    while size >= 1024.0 and i < len(size_names) - 1:
        size /= 1024.0
        i += 1

    return f"{size:.1f} {size_names[i]}"
