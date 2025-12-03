"""
Moderation service for admin content management and review workflow.

This service handles post deletion, approval, report dismissal,
bulk actions, and content filtering with audit logging.
"""

from datetime import datetime, timedelta
from typing import Dict, List, Any

from app import db
from app.models import Post, AdminReport, AdminAction
from app.admin.audit_service import AuditService
from app.utils import is_hate_speech


class ModerationService:
    """Service for content moderation and review workflow."""

    @classmethod
    def delete_post(cls, post_id: int, admin_id: str, reason: str) -> bool:
        """
        Delete a post and create audit log entry.

        Args:
            post_id: ID of post to delete
            admin_id: ID of admin performing action
            reason: Reason for deletion

        Returns:
            True if successful, False if post not found
        """
        post = Post.query.get(post_id)
        if not post:
            return False

        # Create audit log entry before deletion
        audit_payload = {
            "post_id": post_id,
            "reason": reason,
            "deleted_at": datetime.utcnow().isoformat(),
            "original_content": {
                "username": post.username,
                "message": post.message,
                "timestamp": post.timestamp.isoformat() if post.timestamp else None,
            },
        }

        AuditService.create_action(
            actor_id=admin_id, action_type="delete_post", action_payload=audit_payload
        )

        # Delete the post
        db.session.delete(post)
        db.session.commit()

        return True

    @classmethod
    def dismiss_report(cls, report_id: int, admin_id: str, note: str) -> bool:
        """
        Dismiss a report and create audit log entry.

        Args:
            report_id: ID of report to dismiss
            admin_id: ID of admin performing action
            note: Dismissal note

        Returns:
            True if successful, False if report not found
        """
        report = AdminReport.query.get(report_id)
        if not report:
            return False

        # Update report status
        report.status = "dismissed"
        report.updated_at = datetime.utcnow()

        # Create audit log entry
        audit_payload = {
            "report_id": report_id,
            "note": note,
            "dismissed_at": datetime.utcnow().isoformat(),
            "original_report": {
                "post_id": report.post_id,
                "reason": report.reason,
                "created_at": report.created_at.isoformat()
                if report.created_at
                else None,
            },
        }

        AuditService.create_action(
            actor_id=admin_id,
            action_type="dismiss_report",
            action_payload=audit_payload,
        )

        db.session.commit()
        return True

    @classmethod
    def approve_post(cls, post_id: int, admin_id: str, note: str) -> bool:
        """
        Approve a post and create audit log entry.

        Args:
            post_id: ID of post to approve
            admin_id: ID of admin performing action
            note: Approval note

        Returns:
            True if successful, False if post not found
        """
        post = Post.query.get(post_id)
        if not post:
            return False

        # Create audit log entry
        audit_payload = {
            "post_id": post_id,
            "note": note,
            "approved_at": datetime.utcnow().isoformat(),
            "post_content": {
                "username": post.username,
                "message": post.message,
                "timestamp": post.timestamp.isoformat() if post.timestamp else None,
            },
        }

        AuditService.create_action(
            actor_id=admin_id, action_type="approve_post", action_payload=audit_payload
        )

        db.session.commit()
        return True

    @classmethod
    def bulk_delete_posts(
        cls, post_ids: List[int], admin_id: str, reason: str
    ) -> Dict[str, int]:
        """
        Delete multiple posts and create audit log entries.

        Args:
            post_ids: List of post IDs to delete
            admin_id: ID of admin performing action
            reason: Reason for bulk deletion

        Returns:
            Dictionary with deletion statistics
        """
        deleted_count = 0
        audit_entries_created = 0

        for post_id in post_ids:
            if cls.delete_post(post_id, admin_id, reason):
                deleted_count += 1
                audit_entries_created += 1

        return {
            "deleted_count": deleted_count,
            "attempted_count": len(post_ids),
            "audit_entries_created": audit_entries_created,
        }

    @classmethod
    def get_moderation_queue(cls, limit: int = 50) -> List[Dict[str, Any]]:
        """
        Get moderation queue with pending reports.

        Args:
            limit: Maximum number of items to return

        Returns:
            List of moderation queue items with post and report data
        """
        # Get pending reports with associated posts
        pending_reports = (
            AdminReport.query.filter_by(status="pending")
            .order_by(AdminReport.created_at.asc())
            .limit(limit)
            .all()
        )

        queue_items = []
        for report in pending_reports:
            queue_item = {
                "report": {
                    "id": report.id,
                    "reason": report.reason,
                    "status": report.status,
                    "created_at": report.created_at.isoformat()
                    if report.created_at
                    else None,
                },
                "post": None,
            }

            # Include post data if available
            if report.post:
                queue_item["post"] = {
                    "id": report.post.id,
                    "username": report.post.username,
                    "message": report.post.message,
                    "timestamp": report.post.timestamp.isoformat()
                    if report.post.timestamp
                    else None,
                    "kindness_points": report.post.kindness_points,
                }

            queue_items.append(queue_item)

        return queue_items

    @classmethod
    def get_moderation_stats(cls) -> Dict[str, Any]:
        """
        Get moderation statistics.

        Returns:
            Dictionary with moderation statistics
        """
        # Count reports by status
        pending_count = AdminReport.query.filter_by(status="pending").count()
        dismissed_count = AdminReport.query.filter_by(status="dismissed").count()
        action_taken_count = AdminReport.query.filter_by(status="action_taken").count()
        reviewed_count = AdminReport.query.filter_by(status="reviewed").count()

        total_reports = (
            pending_count + dismissed_count + action_taken_count + reviewed_count
        )

        # Calculate resolution rate
        resolved_count = dismissed_count + action_taken_count + reviewed_count
        resolution_rate = (
            (resolved_count / total_reports * 100) if total_reports > 0 else 0
        )

        # Get recent activity (last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        recent_actions = AdminAction.query.filter(
            AdminAction.created_at >= seven_days_ago
        ).count()

        return {
            "pending_reports": pending_count,
            "dismissed_reports": dismissed_count,
            "action_taken_reports": action_taken_count,
            "reviewed_reports": reviewed_count,
            "total_reports": total_reports,
            "resolution_rate": round(resolution_rate, 2),
            "recent_actions_7d": recent_actions,
        }

    @classmethod
    def validate_content(cls, content: str) -> Dict[str, Any]:
        """
        Validate content against hate speech filter.

        Args:
            content: Content to validate

        Returns:
            Dictionary with validation results
        """
        # Use existing hate speech filter
        is_flagged, reason, matched_words = is_hate_speech(content)

        return {
            "is_flagged": is_flagged,
            "reasons": matched_words if is_flagged else [],
            "content_length": len(content),
            "validation_timestamp": datetime.utcnow().isoformat(),
        }

    @classmethod
    def take_action_on_report(
        cls, report_id: int, admin_id: str, action: str, note: str = ""
    ) -> bool:
        """
        Take action on a report (delete post, dismiss, etc.).

        Args:
            report_id: ID of report
            admin_id: ID of admin performing action
            action: Action to take ("delete_post", "dismiss", "approve")
            note: Optional note

        Returns:
            True if successful, False otherwise
        """
        report = AdminReport.query.get(report_id)
        if not report:
            return False

        success = False

        if action == "delete_post":
            success = cls.delete_post(report.post_id, admin_id, note)
            if success:
                report.status = "action_taken"
                report.updated_at = datetime.utcnow()
        elif action == "dismiss":
            success = cls.dismiss_report(report_id, admin_id, note)
        elif action == "approve":
            success = cls.approve_post(report.post_id, admin_id, note)
            if success:
                report.status = "reviewed"
                report.updated_at = datetime.utcnow()

        if success:
            db.session.commit()

        return success

    @classmethod
    def get_post_history(cls, post_id: int) -> List[Dict[str, Any]]:
        """
        Get moderation history for a specific post.

        Args:
            post_id: ID of post

        Returns:
            List of audit entries related to the post
        """
        # Get audit actions related to this post
        audit_actions = (
            AdminAction.query.filter(
                AdminAction.action_payload.contains({"post_id": post_id})
            )
            .order_by(AdminAction.created_at.desc())
            .all()
        )

        history = []
        for action in audit_actions:
            history_item = {
                "id": action.id,
                "actor_id": action.actor_id,
                "action_type": action.action_type,
                "created_at": action.created_at.isoformat()
                if action.created_at
                else None,
                "payload": action.action_payload,
            }
            history.append(history_item)

        return history
