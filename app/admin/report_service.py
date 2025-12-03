"""
Report service for managing admin reports.

This service handles the creation and validation of admin reports,
ensuring they reference valid posts and use appropriate reason categories.
"""

from typing import List, Optional
from sqlalchemy.exc import IntegrityError
from app import db
from app.models import AdminReport, Post


class ReportValidationError(Exception):
    """Raised when report validation fails."""

    pass


class ReportService:
    """Service for managing admin reports."""

    # Valid reason categories for reports
    VALID_REASONS = {
        "spam",
        "hate_speech",
        "harassment",
        "violence",
        "misinformation",
        "inappropriate_content",
        "copyright_violation",
        "privacy_violation",
        "other",
    }

    @classmethod
    def create_report(cls, post_id: int, reason: str) -> AdminReport:
        """
        Create a new admin report.

        Args:
            post_id: ID of the post being reported
            reason: Reason category for the report

        Returns:
            AdminReport: Created report instance

        Raises:
            ReportValidationError: If validation fails
            IntegrityError: If database constraints are violated
        """
        # Validate reason category
        normalized_reason = cls._validate_reason(reason)

        # Validate post exists
        cls._validate_post_exists(post_id)

        # Create report
        report = AdminReport(
            post_id=post_id, reason=normalized_reason, status="pending"
        )

        try:
            db.session.add(report)
            db.session.commit()
            return report
        except IntegrityError as e:
            db.session.rollback()
            raise ReportValidationError(f"Failed to create report: {str(e)}")

    @classmethod
    def get_reports_by_status(cls, status: str, limit: int = 100) -> List[AdminReport]:
        """
        Get reports filtered by status.

        Args:
            status: Status to filter by
                ('pending', 'reviewed', 'dismissed', 'action_taken')
            limit: Maximum number of reports to return

        Returns:
            List of AdminReport objects
        """
        return (
            AdminReport.query.filter_by(status=status)
            .order_by(AdminReport.created_at.desc())
            .limit(limit)
            .all()
        )

    @classmethod
    def get_pending_reports(cls, limit: int = 100) -> List[AdminReport]:
        """Get all pending reports."""
        return cls.get_reports_by_status("pending", limit)

    @classmethod
    def update_report_status(
        cls, report_id: int, new_status: str, admin_id: str
    ) -> Optional[AdminReport]:
        """
        Update the status of a report.

        Args:
            report_id: ID of the report to update
            new_status: New status value
            admin_id: ID of the admin making the change

        Returns:
            Updated AdminReport or None if not found
        """
        report = AdminReport.query.get(report_id)
        if not report:
            return None

        # Validate new status
        if new_status not in ["pending", "reviewed", "dismissed", "action_taken"]:
            raise ReportValidationError(f"Invalid status: {new_status}")

        report.status = new_status
        # Note: updated_at will be handled by database trigger or application logic

        try:
            db.session.commit()
            return report
        except IntegrityError as e:
            db.session.rollback()
            raise ReportValidationError(f"Failed to update report: {str(e)}")

    @classmethod
    def _validate_reason(cls, reason: str) -> str:
        """
        Validate and normalize reason category.

        Args:
            reason: Raw reason string

        Returns:
            Normalized reason string

        Raises:
            ReportValidationError: If reason is invalid
        """
        if not reason or not reason.strip():
            raise ReportValidationError("Reason cannot be empty")

        normalized_reason = reason.strip().lower()

        if normalized_reason not in cls.VALID_REASONS:
            valid_reasons = ", ".join(sorted(cls.VALID_REASONS))
            raise ReportValidationError(
                f"Invalid reason: {reason}. Valid reasons: {valid_reasons}"
            )

        return normalized_reason

    @classmethod
    def _validate_post_exists(cls, post_id: int) -> None:
        """
        Validate that the post exists.

        Args:
            post_id: ID of the post to validate

        Raises:
            ReportValidationError: If post doesn't exist
        """
        post = Post.query.get(post_id)
        if not post:
            raise ReportValidationError(f"Post with ID {post_id} does not exist")

    @classmethod
    def get_report_stats(cls) -> dict:
        """
        Get statistics about reports.

        Returns:
            Dictionary with report statistics
        """
        stats = {}
        for status in ["pending", "reviewed", "dismissed", "action_taken"]:
            count = AdminReport.query.filter_by(status=status).count()
            stats[status] = count

        stats["total"] = sum(stats.values())
        return stats
