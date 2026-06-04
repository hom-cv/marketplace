"""Integration tests for users endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient

from tests.integration.conftest import create_mock_user


class TestUpdateMyProfileEndpoint:
    """Tests for PATCH /api/v1/users/me/profile endpoint."""

    async def test_update_names_and_bio_success(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Updating name/bio (no username) returns 200 without a uniqueness check."""
        updated = create_mock_user(
            user_id=1,
            username="testuser",
            first_name="New",
            last_name="Name",
            bio="Hello there",
        )
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"first_name": "New", "last_name": "Name", "bio": "Hello there"},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["first_name"] == "New"
        assert body["last_name"] == "Name"
        assert body["bio"] == "Hello there"
        mock_user_crud.update_profile.assert_called_once()
        # No username in payload -> no uniqueness lookup.
        mock_user_crud.get_by_username.assert_not_called()

    async def test_clear_last_name_is_allowed(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """An empty last name is accepted (last name is optional)."""
        updated = create_mock_user(user_id=1, username="testuser", last_name="")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"last_name": ""},
        )

        assert response.status_code == 200
        assert response.json()["last_name"] == ""
        assert mock_user_crud.update_profile.call_args.kwargs["last_name"] == ""

    async def test_update_username_normalizes_to_lowercase(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A new username is checked and stored lowercased."""
        mock_user_crud.get_by_username = AsyncMock(return_value=None)
        updated = create_mock_user(user_id=1, username="brandnew")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"username": "BrandNew"},
        )

        assert response.status_code == 200
        mock_user_crud.get_by_username.assert_called_once()
        assert mock_user_crud.get_by_username.call_args.kwargs["username"] == "brandnew"
        assert mock_user_crud.update_profile.call_args.kwargs["username"] == "brandnew"

    async def test_update_username_taken_returns_409(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Changing to a username owned by another user returns 409."""
        existing = create_mock_user(user_id=2, username="taken")
        mock_user_crud.get_by_username = AsyncMock(return_value=existing)
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"username": "Taken"},
        )

        assert response.status_code == 409
        mock_user_crud.update_profile.assert_not_called()

    async def test_update_same_username_skips_uniqueness_check(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Submitting your own username (any case) does not trigger a lookup."""
        # mock_user has username "testuser"; "TestUser" is unchanged once lowered.
        updated = create_mock_user(user_id=1, username="testuser")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"username": "TestUser"},
        )

        assert response.status_code == 200
        mock_user_crud.get_by_username.assert_not_called()
        assert mock_user_crud.update_profile.call_args.kwargs["username"] == "testuser"

    async def test_update_invalid_username_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """A username with illegal characters fails schema validation."""
        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"username": "bad user!"},
        )

        assert response.status_code == 422

    async def test_update_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Updating without authentication returns 401."""
        response = await unauthenticated_client.patch(
            "/api/v1/users/me/profile",
            json={"first_name": "X"},
        )

        assert response.status_code == 401
