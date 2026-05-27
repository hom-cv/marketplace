"""Unit tests for JWT token utilities.

Tests verify token creation, verification, and expiry handling.
"""

from datetime import UTC, datetime, timedelta
from unittest.mock import patch

import jwt
import pytest
from freezegun import freeze_time

from app.core.jwt import (
    ALGORITHM,
    create_access_token,
    create_email_verification_token,
    verify_email_token,
)

# Test constants
TEST_JWT_SECRET = "test-secret-key-for-testing"
TEST_USER_ID = 12345


@pytest.fixture
def mock_settings():
    """Mock settings with a known JWT secret for predictable testing."""
    with patch("app.core.jwt.settings") as mocked:
        mocked.JWT_SECRET_KEY = TEST_JWT_SECRET
        yield mocked


class TestCreateAccessToken:
    """Tests for create_access_token function."""

    def test_creates_valid_jwt_with_payload(self, mock_settings):
        """Token should contain the provided data in payload."""
        payload_data = {"user_id": TEST_USER_ID}

        token = create_access_token(data=payload_data)
        decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

        assert decoded["user_id"] == TEST_USER_ID
        assert decoded["sub"] == "access"

    def test_default_expiry_is_15_minutes(self, mock_settings):
        """Token should expire in 15 minutes by default."""
        with freeze_time("2026-01-05 12:00:00"):
            now = datetime.now(UTC)
            token = create_access_token(data={"user_id": TEST_USER_ID})
            decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

            # exp should be 15 minutes after creation
            expected_exp = int((now + timedelta(minutes=15)).timestamp())
            assert decoded["exp"] == expected_exp

    def test_custom_expiry_is_respected(self, mock_settings):
        """Token should use provided expiry delta."""
        custom_delta = timedelta(hours=2)

        with freeze_time("2026-01-05 12:00:00"):
            now = datetime.now(UTC)
            token = create_access_token(
                data={"user_id": TEST_USER_ID},
                expires_delta=custom_delta,
            )
            decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

            # exp should be 2 hours after creation
            expected_exp = int((now + custom_delta).timestamp())
            assert decoded["exp"] == expected_exp


class TestCreateEmailVerificationToken:
    """Tests for create_email_verification_token function."""

    def test_creates_token_with_user_id(self, mock_settings):
        """Token should contain the user_id in payload."""
        token = create_email_verification_token(user_id=TEST_USER_ID)
        decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

        assert decoded["user_id"] == TEST_USER_ID

    def test_has_email_verification_subject(self, mock_settings):
        """Token should have 'email_verification' as subject."""
        token = create_email_verification_token(user_id=TEST_USER_ID)
        decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

        assert decoded["sub"] == "email_verification"

    def test_expires_in_24_hours(self, mock_settings):
        """Token should expire in 24 hours."""
        with freeze_time("2026-01-05 12:00:00"):
            now = datetime.now(UTC)
            token = create_email_verification_token(user_id=TEST_USER_ID)
            decoded = jwt.decode(token, TEST_JWT_SECRET, algorithms=[ALGORITHM])

            # exp should be 24 hours after creation
            expected_exp = int((now + timedelta(hours=24)).timestamp())
            assert decoded["exp"] == expected_exp


class TestVerifyEmailToken:
    """Tests for verify_email_token function."""

    def test_valid_token_returns_user_id(self, mock_settings):
        """Valid token should return the user_id."""
        token = create_email_verification_token(user_id=TEST_USER_ID)

        result = verify_email_token(token)

        assert result == TEST_USER_ID

    def test_expired_token_returns_none(self, mock_settings):
        """Expired token should return None."""
        # Create token in the past
        with freeze_time("2026-01-01 12:00:00"):
            token = create_email_verification_token(user_id=TEST_USER_ID)

        # Verify in the future (after 24h expiry)
        with freeze_time("2026-01-03 12:00:00"):
            result = verify_email_token(token)

        assert result is None

    def test_invalid_token_returns_none(self, mock_settings):
        """Malformed token should return None."""
        invalid_token = "not.a.valid.jwt.token"

        result = verify_email_token(invalid_token)

        assert result is None

    def test_wrong_subject_returns_none(self, mock_settings):
        """Token with wrong subject should return None."""
        # Create an access token (has sub="access" not "email_verification")
        access_token = create_access_token(data={"user_id": TEST_USER_ID})

        result = verify_email_token(access_token)

        assert result is None

    def test_missing_user_id_returns_none(self, mock_settings):
        """Token without user_id should return None."""
        # Create a raw token without user_id
        payload = {"sub": "email_verification", "exp": 9999999999}
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm=ALGORITHM)

        result = verify_email_token(token)

        assert result is None

    def test_non_integer_user_id_returns_none(self, mock_settings):
        """Token with non-integer user_id should return None."""
        payload = {
            "user_id": "not-an-integer",
            "sub": "email_verification",
            "exp": 9999999999,
        }
        token = jwt.encode(payload, TEST_JWT_SECRET, algorithm=ALGORITHM)

        result = verify_email_token(token)

        assert result is None
