"""
Unit tests for admin audit services following TDD approach.
Tests are written to fail first, then implementation will make them pass.
"""

import pytest
from datetime import datetime, timedelta

# Import app creation function
from app import create_app, db


def get_test_app():
    """Helper to get Flask app from create_app result."""
    app_result = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    return app_result[0] if isinstance(app_result, tuple) else app_result


class TestAuditService:
    """Test AuditService functionality."""

    def test_create_action_with_hash_chain(self):
        """Test that audit actions are created with proper hash chaining."""
        from app.admin.audit_service import AuditService
        from app.models import AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create first action
            action1 = AuditService.create_action(
                actor_id="admin-1",
                action_type="login",
                action_payload={"ip": "127.0.0.1"},
            )

            # Create second action
            action2 = AuditService.create_action(
                actor_id="admin-1",
                action_type="logout",
                action_payload={"ip": "127.0.0.1"},
            )

            # Verify hash chain
            assert action1.prev_hash is None
            assert action2.prev_hash == action1.curr_hash
            assert action1.curr_hash != action2.curr_hash

    def test_verify_chain_integrity(self):
        """Test hash chain integrity verification."""
        from app.admin.audit_service import AuditService
        from app.models import AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create chain of actions
            action1 = AuditService.create_action(
                actor_id="admin-1", action_type="login", action_payload={"step": 1}
            )

            action2 = AuditService.create_action(
                actor_id="admin-1", action_type="process", action_payload={"step": 2}
            )

            action3 = AuditService.create_action(
                actor_id="admin-1", action_type="complete", action_payload={"step": 3}
            )

            # Test valid chain
            assert (
                AuditService.verify_chain_integrity(
                    start_hash=action1.curr_hash, end_hash=action3.curr_hash
                )
                is True
            )

            # Test broken chain
            # Tamper with action2 (but don't commit to avoid affecting verification)
            action2.curr_hash = "tampered_hash"
            # db.session.commit()  # Don't commit tampered data

            assert not AuditService.verify_chain_integrity(
                start_hash=action1.curr_hash, end_hash=action3.curr_hash
            )

    def test_get_action_history(self):
        """Test retrieving audit history with filtering."""
        from app.admin.audit_service import AuditService
        from app.models import AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create actions by different admins
            AuditService.create_action("admin-1", "login", {"admin": "1"})
            AuditService.create_action("admin-2", "login", {"admin": "2"})
            AuditService.create_action("admin-1", "logout", {"admin": "1"})
            AuditService.create_action("admin-1", "delete", {"admin": "1"})

            # Test filtering by actor
            admin1_actions = AuditService.get_action_history(actor_id="admin-1")
            admin2_actions = AuditService.get_action_history(actor_id="admin-2")

            assert len(admin1_actions) == 3
            assert len(admin2_actions) == 1
            assert all(
                action.action_type == "login"
                or action.action_type == "logout"
                or action.action_type == "delete"
                for action in admin1_actions
            )

            # Test filtering by action type
            login_actions = AuditService.get_action_history(action_type="login")
            assert len(login_actions) == 2

    def test_get_chain_stats(self):
        """Test getting audit chain statistics."""
        from app.admin.audit_service import AuditService
        from app.models import AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create various action types
            AuditService.create_action("admin-1", "login", {})
            AuditService.create_action("admin-1", "login", {})
            AuditService.create_action("admin-1", "logout", {})
            AuditService.create_action("admin-2", "delete", {})
            AuditService.create_action("admin-1", "review", {})

            # Get stats
            stats = AuditService.get_chain_stats()

            assert stats["total_actions"] == 5
            assert stats["action_types"]["login"] == 2
            assert stats["action_types"]["logout"] == 1
            assert stats["action_types"]["delete"] == 1
            assert stats["action_types"]["review"] == 1
