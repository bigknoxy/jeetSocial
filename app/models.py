"""
app/models.py

SQLAlchemy models for jeetSocial.
Defines Post model for anonymous social posts and admin models.
"""

from app import db
from datetime import datetime
import hashlib
import json
from sqlalchemy import event
from sqlalchemy.exc import DataError


class Post(db.Model):
    __tablename__ = "post"

    """
    SQLAlchemy model for a social post.
    Fields:
      - id: Primary key
      - username: Random, anonymous username
      - message: Post content
      - timestamp: UTC datetime of post creation
      - kindness_points: integer count of kindness points (default 0)
    """

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(32), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow, index=True)
    kindness_points = db.Column(db.Integer, default=0, nullable=False)


class KindnessVote(db.Model):
    __tablename__ = "kindness_votes"
    """
    Records a redeemed kindness token to prevent double-spend.
    Fields:
      - id: Primary key
      - post_id: FK to Post.id
      - token_hash: sha256 hash of token string (unique)
      - created_at: timestamp of redemption
    """

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer, db.ForeignKey("post.id"), nullable=False, index=True
    )
    token_hash = db.Column(db.String(64), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    post = db.relationship("Post", backref=db.backref("kindness_votes", lazy="dynamic"))


class AdminReport(db.Model):
    """Admin report model for tracking reported posts."""

    __tablename__ = "admin_reports"

    id = db.Column(db.Integer, primary_key=True)
    post_id = db.Column(
        db.Integer,
        db.ForeignKey("post.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    reason = db.Column(db.String(255), nullable=False)
    status = db.Column(
        db.Enum(
            "pending",
            "reviewed",
            "dismissed",
            "action_taken",
            name="admin_report_status",
            validate_strings=True,
        ),
        nullable=False,
        default="pending",
        index=True,
    )
    created_at = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False, index=True
    )
    updated_at = db.Column(db.DateTime, nullable=True)

    # Relationship to Post
    post = db.relationship("Post", backref=db.backref("admin_reports", lazy="dynamic"))

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Note: Validations are handled at database level for proper error types

    def __repr__(self):
        return f"<AdminReport {self.id}: post_id={self.post_id}, reason={self.reason}>"


# Add validation event listeners for AdminReport
@event.listens_for(AdminReport.reason, "set")
def validate_reason_length(target, value, oldvalue, initiator):
    """Validate reason length at database level."""
    if value and len(value) > 255:
        raise DataError(
            f"Reason too long: {len(value)} > 255", {}, ValueError("Reason too long")
        )


@event.listens_for(AdminReport.status, "set")
def validate_status(target, value, oldvalue, initiator):
    """Validate status enum at database level."""
    if value:
        valid_statuses = ["pending", "reviewed", "dismissed", "action_taken"]
        if value not in valid_statuses:
            raise DataError(
                f"Invalid status: {value}", {}, ValueError("Invalid status")
            )


class AdminAction(db.Model):
    """Admin action audit log with hash chain for tamper resistance."""

    __tablename__ = "admin_actions"

    id = db.Column(db.Integer, primary_key=True)
    actor_id = db.Column(
        db.String(255), nullable=False, index=True
    )  # Admin internal ID
    action_type = db.Column(db.String(100), nullable=False, index=True)
    action_payload = db.Column(db.JSON, nullable=False)
    prev_hash = db.Column(
        db.String(64), nullable=True, index=True
    )  # NULL for first entry
    curr_hash = db.Column(db.String(64), nullable=False, unique=True, index=True)
    created_at = db.Column(
        db.DateTime, default=datetime.utcnow, nullable=False, index=True
    )

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self._validate_payload()
        # Hash will be calculated after save when we have the ID

    def _validate_payload(self):
        """Validate action_payload is proper JSON-serializable."""
        if hasattr(self, "action_payload") and self.action_payload is not None:
            try:
                json.dumps(self.action_payload)
            except (TypeError, ValueError):
                raise ValueError("action_payload must be JSON-serializable")

    def _calculate_hash(self):
        """Calculate curr_hash based on record data and prev_hash."""
        # Get previous hash if not provided (for first entry)
        if self.prev_hash is None:
            # Look for most recent entry
            last_action = AdminAction.query.order_by(
                AdminAction.created_at.desc()
            ).first()
            if last_action and last_action.id != self.id:
                self.prev_hash = last_action.curr_hash

        # Create record JSON for hashing
        record_data = {
            "actor_id": self.actor_id,
            "action_type": self.action_type,
            "action_payload": self.action_payload,
            "created_at": self.created_at.isoformat() if self.created_at else None,
            "prev_hash": self.prev_hash,
        }

        # Sort keys for consistent hashing
        record_json = json.dumps(record_data, sort_keys=True)
        return hashlib.sha256(record_json.encode()).hexdigest()

    def update_hash(self):
        """Update hash after saving to database."""
        self.curr_hash = self._calculate_hash()
        db.session.commit()

    def __repr__(self):
        return f"<AdminAction {self.id}: {self.action_type} by {self.actor_id}>"


# Add validation event listeners for AdminAction
@event.listens_for(AdminAction.action_payload, "set")
def validate_action_payload(target, value, oldvalue, initiator):
    """Validate action_payload is JSON-serializable at database level."""
    if value is not None:
        try:
            json.dumps(value)
        except (TypeError, ValueError):
            raise DataError(
                f"action_payload must be JSON-serializable: {value}",
                {},
                ValueError("Invalid JSON"),
            )


@event.listens_for(AdminAction, "before_insert")
def calculate_action_hash(mapper, connection, target):
    """Calculate hash before inserting AdminAction."""
    # Get previous hash if not provided (for first entry)
    if target.prev_hash is None:
        # Look for most recent entry
        last_action = (
            db.session.query(AdminAction)
            .order_by(AdminAction.created_at.desc())
            .first()
        )
        if last_action:
            target.prev_hash = last_action.curr_hash

    # Create record JSON for hashing
    record_data = {
        "actor_id": target.actor_id,
        "action_type": target.action_type,
        "action_payload": target.action_payload,
        "created_at": target.created_at.isoformat() if target.created_at else None,
        "prev_hash": target.prev_hash,
    }

    # Sort keys for consistent hashing
    record_json = json.dumps(record_data, sort_keys=True)
    target.curr_hash = hashlib.sha256(record_json.encode()).hexdigest()


class AdminSession(db.Model):
    """Admin session model for JWT refresh token management."""

    __tablename__ = "admin_sessions"

    id = db.Column(db.Integer, primary_key=True)
    refresh_jti = db.Column(db.String(255), nullable=False, unique=True, index=True)
    admin_id = db.Column(db.String(255), nullable=False, index=True)
    issued_at = db.Column(db.DateTime, default=datetime.utcnow, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    revoked = db.Column(db.Boolean, default=False, nullable=False, index=True)
    device_hash = db.Column(db.String(64), nullable=True)  # Non-PII device fingerprint

    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        # Validation is handled by event listener

    def __repr__(self):
        return (
            f"<AdminSession {self.id}: admin={self.admin_id}, revoked={self.revoked}>"
        )


# Add validation event listener for AdminSession
@event.listens_for(AdminSession.expires_at, "set")
def validate_expiry(target, value, oldvalue, initiator):
    """Validate that expires_at is in the future at database level."""
    if value and value <= datetime.utcnow():
        raise DataError(
            f"expires_at must be in future: {value}", {}, ValueError("Invalid expiry")
        )
