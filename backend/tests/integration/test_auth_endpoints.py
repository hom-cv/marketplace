"""Integration tests for authentication endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from unittest.mock import MagicMock

from httpx import AsyncClient

from app.core.password import get_password_hash
from tests.integration.conftest import create_mock_user


class TestRegisterEndpoint:
    """Tests for POST /api/v1/auth/register endpoint."""

    async def test_register_success_returns_201(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Successful registration should return 201 with user data."""
        # Configure mock to return None (no existing user found)
        mock_user_crud.get_by_email.return_value = None
        mock_user_crud.get_by_username.return_value = None
        
        # Configure mock to return created user
        created_user = create_mock_user(
            user_id=1, username="newuser", email="new@example.com"
        )
        mock_user_crud.create_user.return_value = created_user

        registration_data = {
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "email_address": "new@example.com",
            "password": "securepassword123",
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 201
        body = response.json()
        assert body["username"] == "newuser"
        # Verify CRUD was called (service layer ran)
        mock_user_crud.create_user.assert_called_once()

    async def test_register_trims_whitespace_from_name_fields(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Surrounding whitespace is stripped from name/username at registration."""
        mock_user_crud.get_by_email.return_value = None
        mock_user_crud.get_by_username.return_value = None
        mock_user_crud.create_user.return_value = create_mock_user(
            user_id=1, username="newuser"
        )

        response = await async_client.post(
            "/api/v1/auth/register",
            json={
                "username": "  NewUser  ",
                "first_name": "  New  ",
                "last_name": "  User  ",
                "email_address": "new@example.com",
                "password": "securepassword123",
            },
        )

        assert response.status_code == 201
        created = mock_user_crud.create_user.call_args.kwargs["user"]
        assert created.username == "newuser"  # trimmed then lowercased
        assert created.first_name == "New"
        assert created.last_name == "User"

    async def test_register_duplicate_email_returns_409(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Duplicate email should return 409 Conflict."""
        # Configure mock to return existing user
        existing_user = create_mock_user(email="existing@example.com")
        mock_user_crud.get_by_email.return_value = existing_user

        registration_data = {
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "email_address": "existing@example.com",
            "password": "securepassword123",
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 409

    async def test_register_duplicate_username_returns_409(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Duplicate username should return 409 Conflict."""
        # Email doesn't exist, but username does
        mock_user_crud.get_by_email.return_value = None
        existing_user = create_mock_user(username="existinguser")
        mock_user_crud.get_by_username.return_value = existing_user

        registration_data = {
            "username": "existinguser",
            "first_name": "New",
            "last_name": "User",
            "email_address": "unique@example.com",
            "password": "securepassword123",
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 409

    async def test_register_short_password_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Password shorter than 8 characters should return 422."""
        registration_data = {
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "email_address": "new@example.com",
            "password": "short",  # Too short
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 422

    async def test_register_invalid_email_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Invalid email format should return 422."""
        registration_data = {
            "username": "newuser",
            "first_name": "New",
            "last_name": "User",
            "email_address": "not-an-email",
            "password": "securepassword123",
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 422

    async def test_register_invalid_username_format_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Username with invalid characters should return 422."""
        registration_data = {
            "username": "invalid@user!",  # Special chars not allowed
            "first_name": "New",
            "last_name": "User",
            "email_address": "new@example.com",
            "password": "securepassword123",
        }

        response = await async_client.post(
            "/api/v1/auth/register",
            json=registration_data,
        )

        assert response.status_code == 422


class TestLoginEndpoint:
    """Tests for POST /api/v1/auth/login endpoint."""

    async def test_login_success_returns_token(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Successful login should return access token."""
        # Create user with hashed password
        mock_user_with_password = create_mock_user()
        mock_user_with_password.hashed_password = get_password_hash("correctpassword")
        mock_user_crud.get_by_email.return_value = mock_user_with_password

        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "correctpassword",
            },
        )

        assert response.status_code == 200
        body = response.json()
        assert "access_token" in body
        assert body["token_type"] == "bearer"

    async def test_login_invalid_credentials_returns_401(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Invalid credentials should return 401 Unauthorized."""
        # User exists but password is wrong
        mock_user_with_password = create_mock_user()
        mock_user_with_password.hashed_password = get_password_hash("correctpassword")
        mock_user_crud.get_by_email.return_value = mock_user_with_password

        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": "test@example.com",
                "password": "wrongpassword",
            },
        )

        assert response.status_code == 401

    async def test_login_nonexistent_user_returns_401(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Login with non-existent user should return 401."""
        mock_user_crud.get_by_email.return_value = None

        response = await async_client.post(
            "/api/v1/auth/login",
            data={
                "username": "nonexistent@example.com",
                "password": "anypassword",
            },
        )

        assert response.status_code == 401


class TestGetCurrentUserEndpoint:
    """Tests for GET /api/v1/auth/me endpoint."""

    async def test_get_me_returns_user_info(
        self,
        async_client: AsyncClient,
        mock_user: MagicMock,
    ):
        """Authenticated request should return user info."""
        response = await async_client.get("/api/v1/auth/me")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == mock_user.id
        assert body["username"] == mock_user.username
        assert body["email_address"] == mock_user.email_address

    async def test_get_me_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Request without token should return 401."""
        response = await unauthenticated_client.get("/api/v1/auth/me")

        assert response.status_code == 401
