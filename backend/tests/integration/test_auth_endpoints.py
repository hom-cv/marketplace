"""Integration tests for authentication endpoints.

Tests verify request/response handling, validation, and error cases
using mocked services (no real database).
"""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from httpx import AsyncClient

from app.core.exceptions import conflict_error, unauthorized_error


class TestRegisterEndpoint:
    """Tests for POST /api/v1/auth/register endpoint."""

    async def test_register_success_returns_201(
        self,
        async_client: AsyncClient,
        mock_auth_service: MagicMock,
        mock_user: MagicMock,
    ):
        """Successful registration should return 201 with user data."""
        mock_auth_service.register_user.return_value = mock_user

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
        assert body["id"] == mock_user.id
        assert body["username"] == mock_user.username

    async def test_register_duplicate_email_returns_409(
        self,
        async_client: AsyncClient,
        mock_auth_service: MagicMock,
    ):
        """Duplicate email should return 409 Conflict."""
        mock_auth_service.register_user.side_effect = conflict_error(
            "A user with this email address already exists"
        )

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
        mock_auth_service: MagicMock,
    ):
        """Duplicate username should return 409 Conflict."""
        mock_auth_service.register_user.side_effect = conflict_error(
            "A user with this username already exists"
        )

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
        mock_auth_service: MagicMock,
        mock_user: MagicMock,
    ):
        """Successful login should return access token."""
        mock_auth_service.login_user.return_value = mock_user

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
        mock_auth_service: MagicMock,
    ):
        """Invalid credentials should return 401 Unauthorized."""
        mock_auth_service.login_user.side_effect = unauthorized_error(
            "Invalid email or password"
        )

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
        mock_auth_service: MagicMock,
    ):
        """Login with non-existent user should return 401."""
        mock_auth_service.login_user.side_effect = unauthorized_error(
            "Invalid email or password"
        )

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
