"""
Unit tests for admin moderation service following TDD approach.
Tests are written to fail first, then implementation will make them pass.
"""

# Import app creation function
from app import create_app, db


def get_test_app():
    """Helper to get Flask app from create_app result."""
    app_result = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    return app_result[0] if isinstance(app_result, tuple) else app_result


class TestModerationService:
    """Test ModerationService functionality."""

    def test_delete_post_with_audit_log(self):
        """Test that post deletion creates proper audit log entry."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test post
            test_post = Post(username="testuser", message="test message")
            db.session.add(test_post)
            db.session.commit()

            post_id = test_post.id

            # Delete post
            result = ModerationService.delete_post(
                post_id=post_id,
                admin_id="admin-1",
                reason="Violation of community guidelines",
            )

            assert result is True

            # Verify post is deleted
            deleted_post = Post.query.get(post_id)
            assert deleted_post is None

            # Verify audit log entry created
            audit_entry = AdminAction.query.filter_by(
                actor_id="admin-1", action_type="delete_post"
            ).first()

            assert audit_entry is not None
            assert audit_entry.action_payload["post_id"] == post_id
            assert (
                audit_entry.action_payload["reason"]
                == "Violation of community guidelines"
            )
            assert "deleted_at" in audit_entry.action_payload

    def test_dismiss_report_with_status_update(self):
        """Test that report dismissal updates status and creates audit log."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminReport, AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test post and report
            test_post = Post(username="testuser", message="test message")
            db.session.add(test_post)
            db.session.commit()

            report = AdminReport(post_id=test_post.id, reason="spam", status="pending")
            db.session.add(report)
            db.session.commit()

            report_id = report.id

            # Dismiss report
            result = ModerationService.dismiss_report(
                report_id=report_id, admin_id="admin-1", note="No violation found"
            )

            assert result is True

            # Verify report status updated
            updated_report = AdminReport.query.get(report_id)
            assert updated_report.status == "dismissed"
            assert updated_report.updated_at is not None

            # Verify audit log entry created
            audit_entry = AdminAction.query.filter_by(
                actor_id="admin-1", action_type="dismiss_report"
            ).first()

            assert audit_entry is not None
            assert audit_entry.action_payload["report_id"] == report_id
            assert audit_entry.action_payload["note"] == "No violation found"

    def test_approve_post_with_audit_log(self):
        """Test that post approval creates audit log entry."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test post
            test_post = Post(username="testuser", message="test message")
            db.session.add(test_post)
            db.session.commit()

            post_id = test_post.id

            # Approve post
            result = ModerationService.approve_post(
                post_id=post_id, admin_id="admin-1", note="Content is appropriate"
            )

            assert result is True

            # Verify post still exists
            approved_post = Post.query.get(post_id)
            assert approved_post is not None

            # Verify audit log entry created
            audit_entry = AdminAction.query.filter_by(
                actor_id="admin-1", action_type="approve_post"
            ).first()

            assert audit_entry is not None
            assert audit_entry.action_payload["post_id"] == post_id
            assert audit_entry.action_payload["note"] == "Content is appropriate"

    def test_bulk_action_on_multiple_posts(self):
        """Test bulk actions on multiple posts with proper audit logging."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create multiple test posts
            posts = []
            for i in range(3):
                post = Post(username=f"user{i}", message=f"message {i}")
                db.session.add(post)
                posts.append(post)
            db.session.commit()

            post_ids = [p.id for p in posts]

            # Perform bulk delete
            result = ModerationService.bulk_delete_posts(
                post_ids=post_ids, admin_id="admin-1", reason="Spam campaign"
            )

            assert result["deleted_count"] == 3
            assert result["audit_entries_created"] == 3

            # Verify all posts deleted
            for post_id in post_ids:
                deleted_post = Post.query.get(post_id)
                assert deleted_post is None

            # Verify audit log entries created
            audit_entries = AdminAction.query.filter_by(
                actor_id="admin-1", action_type="delete_post"
            ).all()

            assert len(audit_entries) == 3

            # Verify each audit entry has correct payload
            for entry in audit_entries:
                assert entry.action_payload["reason"] == "Spam campaign"
                assert "deleted_at" in entry.action_payload

    def test_get_moderation_queue(self):
        """Test retrieving moderation queue with pending reports."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminReport

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test posts and reports
            posts = []
            for i in range(5):
                post = Post(username=f"user{i}", message=f"message {i}")
                db.session.add(post)
                posts.append(post)
            db.session.commit()

            # Create reports for some posts
            for i in range(3):
                report = AdminReport(
                    post_id=posts[i].id,
                    reason="spam" if i % 2 == 0 else "harassment",
                    status="pending",
                )
                db.session.add(report)
            db.session.commit()

            # Get moderation queue
            queue = ModerationService.get_moderation_queue(limit=10)

            assert len(queue) == 3
            assert all(item["status"] == "pending" for item in queue)
            assert all("post" in item for item in queue)
            assert all("report" in item for item in queue)

    def test_get_moderation_stats(self):
        """Test getting moderation statistics."""
        from app.admin.moderation_service import ModerationService
        from app.models import Post, AdminReport

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test data
            posts = []
            for i in range(10):
                post = Post(username=f"user{i}", message=f"message {i}")
                db.session.add(post)
                posts.append(post)
            db.session.commit()

            # Create reports with different statuses
            reports_data = [
                (posts[0].id, "spam", "pending"),
                (posts[1].id, "harassment", "pending"),
                (posts[2].id, "spam", "dismissed"),
                (posts[3].id, "inappropriate_content", "action_taken"),
            ]

            for post_id, reason, status in reports_data:
                report = AdminReport(post_id=post_id, reason=reason, status=status)
                db.session.add(report)
            db.session.commit()

            # Get stats
            stats = ModerationService.get_moderation_stats()

            assert stats["pending_reports"] == 2
            assert stats["dismissed_reports"] == 1
            assert stats["action_taken_reports"] == 1
            assert stats["total_reports"] == 4
            assert "resolution_rate" in stats

    def test_content_filter_validation(self):
        """Test content filter validation before moderation actions."""
        from app.admin.moderation_service import ModerationService

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Test content that should be flagged
            flagged_content = "This is hate speech content"
            filter_result = ModerationService.validate_content(flagged_content)

            assert filter_result["is_flagged"] is True
            assert "reasons" in filter_result
            assert len(filter_result["reasons"]) > 0

            # Test clean content
            clean_content = "This is a kind and supportive message"
            filter_result = ModerationService.validate_content(clean_content)

            assert filter_result["is_flagged"] is False
            assert len(filter_result["reasons"]) == 0

    def test_nonexistent_post_handling(self):
        """Test handling of moderation actions on non-existent posts."""
        from app.admin.moderation_service import ModerationService

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Try to delete non-existent post
            result = ModerationService.delete_post(
                post_id=999999, admin_id="admin-1", reason="Test"
            )

            assert result is False

            # Try to approve non-existent post
            result = ModerationService.approve_post(
                post_id=999999, admin_id="admin-1", note="Test"
            )

            assert result is False

    def test_nonexistent_report_handling(self):
        """Test handling of moderation actions on non-existent reports."""
        from app.admin.moderation_service import ModerationService

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Try to dismiss non-existent report
            result = ModerationService.dismiss_report(
                report_id=999999, admin_id="admin-1", note="Test"
            )

            assert result is False
