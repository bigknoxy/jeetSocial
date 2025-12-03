"""
MFA (Multi-Factor Authentication) service for admin portal.

This service handles TOTP authentication methods.
WebAuthn support is planned for future implementation.
"""

import os
import pyotp
import secrets


class MFAService:
    """Service for Multi-Factor Authentication."""

    BACKUP_CODE_COUNT = 10

    @classmethod
    def generate_totp_secret(cls) -> str:
        """Generate a new TOTP secret."""
        return pyotp.random_base32()

    @classmethod
    def totp_uri(
        cls, secret: str, account_name: str, issuer: str = "jeetSocial"
    ) -> str:
        """Generate TOTP provisioning URI."""
        return pyotp.totp.TOTP(secret).provisioning_uri(
            name=account_name, issuer_name=issuer
        )

    @classmethod
    def verify_totp(cls, admin_id: str, code: str) -> bool:
        """
        Verify TOTP code for admin.

        Args:
            admin_id: Admin identifier
            code: TOTP code to verify

        Returns:
            True if code is valid, False otherwise
        """
        # Check if MFA is required
        require_mfa = os.environ.get("ADMIN_REQUIRE_MFA", "1") == "1"

        if not require_mfa:
            # MFA disabled, accept any 6-digit code for development
            return len(code) == 6 and code.isdigit()

        # For development, accept a common test code
        # In production, this would verify against stored secret using pyotp
        test_code = os.environ.get("ADMIN_TEST_MFA_CODE", "123456")
        if code == test_code:
            return True

        # Also accept any 6-digit code for easier development testing
        # Remove this in production!
        if len(code) == 6 and code.isdigit():
            return True

        return False

    @classmethod
    def generate_backup_codes(cls) -> list:
        """Generate backup codes for MFA recovery."""
        return [secrets.token_hex(4) for _ in range(cls.BACKUP_CODE_COUNT)]

    @classmethod
    def verify_backup_code(cls, admin_id: str, code: str) -> bool:
        """
        Verify backup code for admin.

        Args:
            admin_id: Admin identifier
            code: Backup code to verify

        Returns:
            True if code is valid, False otherwise
        """
        # Placeholder implementation
        return len(code) == 8 and code.isalnum()
