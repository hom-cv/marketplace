"""Unit tests for password hashing utilities.

Tests verify bcrypt hashing and verification functionality.
"""

from app.core.password import get_password_hash, verify_password


class TestGetPasswordHash:
    """Tests for get_password_hash function."""

    def test_returns_bcrypt_formatted_hash(self):
        """Hash should be a bcrypt-formatted string starting with $2b$."""
        plain_password = "secure_password_123"

        hashed = get_password_hash(plain_password)

        assert hashed.startswith("$2b$")
        assert len(hashed) == 60  # bcrypt hashes are always 60 chars

    def test_different_passwords_produce_different_hashes(self):
        """Different passwords should produce different hashes."""
        password_one = "first_password"
        password_two = "second_password"

        hash_one = get_password_hash(password_one)
        hash_two = get_password_hash(password_two)

        assert hash_one != hash_two

    def test_same_password_produces_unique_hashes(self):
        """Same password should produce different hashes due to unique salt."""
        password = "same_password"

        first_hash = get_password_hash(password)
        second_hash = get_password_hash(password)

        assert first_hash != second_hash


class TestVerifyPassword:
    """Tests for verify_password function."""

    def test_correct_password_returns_true(self):
        """Verification should succeed for correct password."""
        plain_password = "my_secret_password"
        hashed_password = get_password_hash(plain_password)

        is_valid = verify_password(plain_password, hashed_password)

        assert is_valid is True

    def test_incorrect_password_returns_false(self):
        """Verification should fail for incorrect password."""
        correct_password = "correct_password"
        wrong_password = "wrong_password"
        hashed_password = get_password_hash(correct_password)

        is_valid = verify_password(wrong_password, hashed_password)

        assert is_valid is False

    def test_empty_password_returns_false(self):
        """Verification should fail for empty password against non-empty hash."""
        original_password = "original_password"
        hashed_password = get_password_hash(original_password)

        is_valid = verify_password("", hashed_password)

        assert is_valid is False

    def test_case_sensitive_verification(self):
        """Password verification should be case-sensitive."""
        password = "CaseSensitive123"
        wrong_case = "casesensitive123"
        hashed_password = get_password_hash(password)

        is_valid = verify_password(wrong_case, hashed_password)

        assert is_valid is False
