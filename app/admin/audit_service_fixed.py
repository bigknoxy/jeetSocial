"""
Audit service for managing admin action audit logs with hash chain.

This service handles the creation of audit entries with tamper-resistant
hash chaining for maintaining integrity of admin action logs.
"""

import hashlib
import json
from typing import Dict, Any, Optional

from app import db
from app.models import AdminAction


class AuditService:
    """Service for managing admin audit logs with hash chain integrity."""

    @classmethod
    def create_action(
        cls, actor_id: str, action_type: str, action_payload: Dict[str, Any]
    ) -> AdminAction:
        """
        Create a new audit action with hash chain integrity.

        Args:
            actor_id: ID of admin performing action
            action_type: Type of action being performed
            action_payload: Dictionary containing action details

        Returns:
            AdminAction: Created audit entry with hash chain
        """
        # Get previous hash for chain integrity
        prev_hash = cls._get_previous_hash()

        # Create action record
        action = AdminAction(
            actor_id=actor_id,
            action_type=action_type,
            action_payload=action_payload,
            prev_hash=prev_hash,
        )

        # The hash will be calculated after saving
        try:
            db.session.add(action)
            db.session.flush()  # Get ID without committing
            action.update_hash()  # Update hash with proper prev_hash
            db.session.commit()
            return action
        except Exception as e:
            db.session.rollback()
            raise Exception(f"Failed to create audit entry: {str(e)}")

    @classmethod
    def _get_previous_hash(cls) -> Optional[str]:
        """
        Get the hash of the most recent audit entry.

        Returns:
            Previous hash string or None if no entries exist
        """
        last_action = AdminAction.query.order_by(AdminAction.created_at.desc()).first()

        return last_action.curr_hash if last_action else None

    @classmethod
    def verify_chain_integrity(
        cls, start_hash: Optional[str] = None, end_hash: Optional[str] = None
    ) -> bool:
        """
        Verify integrity of hash chain between two points.

        Args:
            start_hash: Starting hash (None for beginning of chain)
            end_hash: Ending hash (None for latest entry)

        Returns:
            bool: True if chain integrity is maintained
        """
        query = AdminAction.query.order_by(AdminAction.created_at.asc())

        # Find starting point
        if start_hash:
            start_action = AdminAction.query.filter_by(curr_hash=start_hash).first()
            if not start_action:
                return False
            query = query.filter(AdminAction.created_at >= start_action.created_at)

        # Find ending point
        if end_hash:
            end_action = AdminAction.query.filter_by(curr_hash=end_hash).first()
            if not end_action:
                return False
            query = query.filter(AdminAction.created_at <= end_action.created_at)

        # Verify chain integrity
        actions = query.all()

        for i, action in enumerate(actions):
            if i == 0:
                # First action should have prev_hash as None or match start_hash
                if start_hash and action.prev_hash != start_hash:
                    return False
            else:
                # Subsequent actions should have prev_hash matching previous curr_hash
                expected_prev_hash = actions[i - 1].curr_hash
                if action.prev_hash != expected_prev_hash:
                    return False

                # Verify current hash is correct
                expected_curr_hash = cls._calculate_action_hash(action)
                if action.curr_hash != expected_curr_hash:
                    return False

        return True

    @classmethod
    def _calculate_action_hash(cls, action: AdminAction) -> str:
        """
        Calculate expected hash for an action.

        Args:
            action: AdminAction instance

        Returns:
            str: Calculated SHA-256 hash
        """
        record_data = {
            "actor_id": action.actor_id,
            "action_type": action.action_type,
            "action_payload": action.action_payload,
            "created_at": action.created_at.isoformat() if action.created_at else None,
            "prev_hash": action.prev_hash,
        }

        # Sort keys for consistent hashing
        record_json = json.dumps(record_data, sort_keys=True)
        return hashlib.sha256(record_json.encode()).hexdigest()

    @classmethod
    def get_action_history(
        cls,
        actor_id: Optional[str] = None,
        action_type: Optional[str] = None,
        limit: int = 100,
    ) -> list:
        """
        Get audit history with optional filtering.

        Args:
            actor_id: Filter by specific admin ID
            action_type: Filter by specific action type
            limit: Maximum number of entries to return

        Returns:
            list: AdminAction entries matching criteria
        """
        query = AdminAction.query.order_by(AdminAction.created_at.desc())

        if actor_id:
            query = query.filter(AdminAction.actor_id == actor_id)

        if action_type:
            query = query.filter(AdminAction.action_type == action_type)

        return query.limit(limit).all()

    @classmethod
    def get_chain_stats(cls) -> Dict[str, int]:
        """
        Get statistics about the audit chain.

        Returns:
            dict: Statistics about the audit chain
        """
        total_actions = AdminAction.query.count()

        # Count actions by type
        action_types = (
            db.session.query(AdminAction.action_type, db.func.count(AdminAction.id))
            .group_by(AdminAction.action_type)
            .all()
        )

        stats = {
            "total_actions": total_actions,
            "action_types": {action_type: count for action_type, count in action_types},
        }

        return stats
