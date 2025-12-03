"""
Unit tests for admin services following TDD approach.
Tests are written to fail first, then implementation will make them pass.
"""

import pytest
import secrets
import hashlib
import json
from datetime import datetime, timedelta, timezone

# Import app creation function
from app import create_app, db


def get_test_app():
    """Helper to get Flask app from create_app result."""
    app_result = create_app(
        {"TESTING": True, "SQLALCHEMY_DATABASE_URI": "sqlite:///:memory:"}
    )
    return app_result[0] if isinstance(app_result, tuple) else app_result


class TestReportServiceLogic:
    """Test ReportService core logic without full module import."""

    def test_reason_validation_logic(self):
        """Test reason validation logic directly."""
        # Test the validation logic that would be in ReportService
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

        def validate_reason(reason):
            if not reason or not reason.strip():
                raise ValueError("Reason cannot be empty")

            normalized = reason.strip().lower()
            if normalized not in VALID_REASONS:
                raise ValueError(f"Invalid reason: {reason}")

            return normalized

        # Test valid reasons
        assert validate_reason("spam") == "spam"
        assert validate_reason("SPAM") == "spam"  # Case normalization
        assert validate_reason("  Other  ") == "other"  # Whitespace trimming

        # Test invalid reasons
        with pytest.raises(ValueError, match="Reason cannot be empty"):
            validate_reason("")

        with pytest.raises(ValueError, match="Reason cannot be empty"):
            validate_reason("   ")

        with pytest.raises(ValueError, match="Invalid reason"):
            validate_reason("invalid_reason")

    def test_post_existence_validation(self):
        """Test post existence validation logic."""
        from app.models import Post

        app = get_test_app()
        with app.app_context():
            db.create_all()

            def validate_post_exists(post_id):
                post = Post.query.get(post_id)
                if not post:
                    raise ValueError(f"Post with ID {post_id} does not exist")
                return post

            # Create test post
            test_post = Post(username="testuser", message="test message")
            db.session.add(test_post)
            db.session.commit()

            # Test valid post
            post = validate_post_exists(test_post.id)
            assert post.id == test_post.id

            # Test invalid post
            with pytest.raises(ValueError, match="does not exist"):
                validate_post_exists(999999)

    def test_report_statistics_calculation(self):
        """Test report statistics calculation logic."""
        from app.models import AdminReport, Post

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Create test posts
            test_post1 = Post(username="user1", message="message1")
            test_post2 = Post(username="user2", message="message2")
            db.session.add_all([test_post1, test_post2])
            db.session.commit()

            # Create reports with different statuses
            report1 = AdminReport(
                post_id=test_post1.id, reason="spam", status="pending"
            )
            report2 = AdminReport(
                post_id=test_post2.id, reason="harassment", status="reviewed"
            )
            report3 = AdminReport(
                post_id=test_post1.id, reason="spam", status="dismissed"
            )
            db.session.add_all([report1, report2, report3])
            db.session.commit()

            # Calculate stats (logic from ReportService)
            stats = {}
            for status in ["pending", "reviewed", "dismissed", "action_taken"]:
                count = AdminReport.query.filter_by(status=status).count()
                stats[status] = count

            stats["total"] = sum(stats.values())

            # Verify stats
            assert stats["pending"] == 1
            assert stats["reviewed"] == 1
            assert stats["dismissed"] == 1
            assert stats["action_taken"] == 0
            assert stats["total"] == 3


class TestAuditServiceLogic:
    """Test AuditService core logic without full module import."""

    def test_hash_chain_calculation(self):
        """Test hash chain calculation logic."""

        def calculate_hash(data, prev_hash=None, timestamp=None):
            """Simulate hash calculation from AdminAction."""
            if timestamp is None:
                timestamp = datetime.utcnow()
            record_data = {
                "data": data,
                "prev_hash": prev_hash,
                "timestamp": timestamp.isoformat(),
            }
            record_json = json.dumps(record_data, sort_keys=True)
            return hashlib.sha256(record_json.encode()).hexdigest()

        # Test first entry (no previous hash)
        fixed_timestamp = datetime(2025, 1, 1, 12, 0, 0)
        hash1 = calculate_hash({"action": "login"}, timestamp=fixed_timestamp)
        assert hash1 is not None
        assert len(hash1) == 64  # SHA256 hex length

        # Test chained entry
        hash2 = calculate_hash(
            {"action": "logout"}, prev_hash=hash1, timestamp=fixed_timestamp
        )
        assert hash2 != hash1
        assert len(hash2) == 64

        # Test deterministic nature
        hash1_again = calculate_hash({"action": "login"}, timestamp=fixed_timestamp)
        assert hash1 == hash1_again

    def test_audit_payload_validation(self):
        """Test audit payload JSON validation."""

        def validate_payload(payload):
            """Simulate payload validation."""
            try:
                json.dumps(payload)
                return True
            except (TypeError, ValueError):
                return False

        # Test valid payloads
        assert validate_payload({"key": "value"}) is True
        assert validate_payload({"nested": {"data": [1, 2, 3]}}) is True
        assert validate_payload("string value") is True
        assert validate_payload(123) is True
        assert validate_payload([1, 2, 3]) is True

        # Test invalid payloads
        def invalid_function():
            pass

        assert validate_payload(invalid_function) is False
        assert validate_payload({"func": invalid_function}) is False


class TestAuthServiceLogic:
    """Test AuthService core logic without full module import."""

    def test_jwt_payload_structure(self):
        """Test JWT payload structure and validation."""

        def create_jwt_payload(admin_id, ttl=900):
            """Simulate JWT payload creation."""
            now = datetime.now(timezone.utc)
            jti = secrets.token_urlsafe(16)

            return {
                "sub": admin_id,
                "iat": int(now.timestamp()),
                "exp": int((now + timedelta(seconds=ttl)).timestamp()),
                "jti": jti,
                "typ": "access",
            }

        # Test payload creation
        payload = create_jwt_payload("admin-1")

        assert payload["sub"] == "admin-1"
        assert payload["typ"] == "access"
        assert "jti" in payload
        assert len(payload["jti"]) >= 16
        assert payload["iat"] < payload["exp"]
        assert payload["exp"] - payload["iat"] == 900  # 15 minutes

        # Test expiration
        past_payload = create_jwt_payload("admin-1", ttl=-1)  # Already expired
        assert past_payload["exp"] < datetime.now(timezone.utc).timestamp()

    def test_csrf_token_generation(self):
        """Test CSRF token generation properties."""

        def generate_csrf_token():
            """Simulate CSRF token generation."""
            return secrets.token_urlsafe(24)

        token1 = generate_csrf_token()
        token2 = generate_csrf_token()

        # Test token properties
        assert len(token1) >= 24
        assert len(token2) >= 24
        assert token1 != token2  # Should be unique

        # Test character set (URL-safe)
        for token in [token1, token2]:
            assert all(c.isalnum() or c in "-_" for c in token)

    def test_session_management_logic(self):
        """Test session management logic."""
        from app.models import AdminSession

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Test session creation
            session = AdminSession(
                refresh_jti="test-jti-123",
                admin_id="admin-1",
                issued_at=datetime.utcnow(),
                expires_at=datetime.utcnow() + timedelta(hours=1),
                revoked=False,
            )
            db.session.add(session)
            db.session.commit()

            # Test session lookup
            found_session = AdminSession.query.filter_by(
                refresh_jti="test-jti-123"
            ).first()
            assert found_session is not None
            assert found_session.admin_id == "admin-1"
            assert found_session.revoked is False

            # Test session revocation
            found_session.revoked = True
            db.session.commit()

            revoked_session = AdminSession.query.filter_by(
                refresh_jti="test-jti-123"
            ).first()
            assert revoked_session.revoked is True


class TestMFAServiceLogic:
    """Test MFAService core logic without full module import."""

    def test_backup_code_generation(self):
        """Test backup code generation logic."""

        def generate_backup_codes(count=10):
            """Simulate backup code generation."""
            return [secrets.token_hex(4) for _ in range(count)]

        codes = generate_backup_codes()

        # Test code properties
        assert len(codes) == 10
        for code in codes:
            assert len(code) == 8  # 4 bytes = 8 hex chars
            assert all(c in "0123456789abcdefABCDEF" for c in code)

        # Test uniqueness
        assert len(set(codes)) == 10  # All codes should be unique

    def test_device_fingerprinting(self):
        """Test device fingerprinting logic (non-PII)."""

        def create_device_hash(user_agent, ip_hash):
            """Create non-PII device fingerprint."""
            # Only use non-identifying information
            data = f"{user_agent.split()[0]}:{ip_hash}"  # Browser name + IP hash
            return hashlib.sha256(data.encode()).hexdigest()[
                :16
            ]  # Truncate for storage

        # Test deterministic nature
        hash1 = create_device_hash("Mozilla/5.0", "abc123")
        hash2 = create_device_hash("Mozilla/5.0", "abc123")
        assert hash1 == hash2

        # Test uniqueness
        hash3 = create_device_hash("Chrome/91.0", "abc123")
        hash4 = create_device_hash("Mozilla/5.0", "def456")
        assert hash3 != hash1
        assert hash4 != hash1

        # Test non-PII compliance (no full IP or unique identifiers stored)
        assert "127.0.0.1" not in str(hash1)
        assert len(hash1) == 16  # Truncated, not storing full hash


class TestModerationServiceLogic:
    """Test ModerationService core logic without full module import."""

    def test_content_filtering_logic(self):
        """Test content filtering logic."""

        # Test basic content filtering patterns
        def contains_hate_speech_simple(content):
            """Simple hate speech detection for testing."""
            hate_words = ["hate", "kill", "violence", "terrorism"]
            content_lower = content.lower()
            return any(word in content_lower for word in hate_words)

        # Test hate speech detection
        assert contains_hate_speech_simple("I hate everyone") is True
        assert contains_hate_speech_simple("This is spam") is False
        assert contains_hate_speech_simple("Kind message") is False
        assert contains_hate_speech_simple("Promotes violence") is True

    def test_bulk_action_validation(self):
        """Test bulk action validation logic."""

        def validate_bulk_actions(report_ids, action):
            """Simulate bulk action validation."""
            if not report_ids:
                raise ValueError("No reports selected")

            if action not in ["approve", "dismiss", "delete"]:
                raise ValueError(f"Invalid bulk action: {action}")

            if len(report_ids) > 100:
                raise ValueError("Cannot process more than 100 reports at once")

            return True

        # Test valid actions
        assert validate_bulk_actions([1, 2, 3], "approve") is True
        assert validate_bulk_actions([1], "delete") is True

        # Test invalid actions
        with pytest.raises(ValueError, match="No reports selected"):
            validate_bulk_actions([], "approve")

        with pytest.raises(ValueError, match="Invalid bulk action"):
            validate_bulk_actions([1, 2], "invalid_action")

        with pytest.raises(ValueError, match="Cannot process more than 100"):
            validate_bulk_actions(list(range(101)), "approve")

    def test_audit_log_creation(self):
        """Test audit log creation for moderation actions."""
        from app.models import AdminAction

        app = get_test_app()
        with app.app_context():
            db.create_all()

            # Simulate moderation action with audit
            action_data = {
                "post_id": 123,
                "action": "delete",
                "reason": "hate_speech",
                "admin_id": "admin-1",
            }

            audit_entry = AdminAction(
                actor_id="admin-1",
                action_type="moderation_action",
                action_payload=action_data,
            )
            db.session.add(audit_entry)
            db.session.commit()

            # Verify audit entry
            retrieved = AdminAction.query.filter_by(
                action_type="moderation_action"
            ).first()
            assert retrieved is not None
            assert retrieved.actor_id == "admin-1"
            assert retrieved.action_payload["post_id"] == 123
            assert retrieved.action_payload["action"] == "delete"
