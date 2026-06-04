"""Integration tests for users endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).

PATCH /users/me/profile is a full replacement: every editable field must be
present in the body (send the current value for anything that isn't changing).
"""

from typing import Any
from unittest.mock import AsyncMock, MagicMock

from httpx import AsyncClient

from tests.integration.conftest import create_mock_user


def _profile_payload(**overrides: Any) -> dict[str, Any]:
    """A complete, valid profile body; override individual fields per test."""
    body: dict[str, Any] = {
        "username": "testuser",
        "first_name": "Test",
        "last_name": "User",
        "bio": "hello",
        "show_full_name": True,
    }
    body.update(overrides)
    return body


class TestUpdateMyProfileEndpoint:
    """Tests for PATCH /api/v1/users/me/profile endpoint."""

    async def test_update_full_profile_success(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Submitting the full profile (username unchanged) returns 200."""
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
            json=_profile_payload(first_name="New", last_name="Name", bio="Hello there"),
        )

        assert response.status_code == 200
        body = response.json()
        assert body["first_name"] == "New"
        assert body["last_name"] == "Name"
        assert body["bio"] == "Hello there"
        mock_user_crud.update_profile.assert_called_once()
        # Username unchanged -> no uniqueness lookup.
        mock_user_crud.get_by_username.assert_not_called()

    async def test_partial_payload_is_rejected(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A request missing fields is rejected (full replacement is required)."""
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json={"first_name": "New"},
        )

        assert response.status_code == 422
        mock_user_crud.update_profile.assert_not_called()

    async def test_clear_last_name_with_empty_string(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """An empty last name is accepted (last name is optional)."""
        updated = create_mock_user(user_id=1, username="testuser", last_name="")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(last_name=""),
        )

        assert response.status_code == 200
        assert response.json()["last_name"] == ""
        assert mock_user_crud.update_profile.call_args.kwargs["last_name"] == ""

    async def test_null_last_name_normalized_to_empty(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A null last name is normalized to "" to satisfy the NOT NULL column."""
        updated = create_mock_user(user_id=1, username="testuser", last_name="")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(last_name=None),
        )

        assert response.status_code == 200
        assert mock_user_crud.update_profile.call_args.kwargs["last_name"] == ""

    async def test_null_bio_clears_the_field(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A null bio is forwarded as None so the nullable column is cleared."""
        updated = create_mock_user(user_id=1, username="testuser", bio=None)
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(bio=None),
        )

        assert response.status_code == 200
        assert mock_user_crud.update_profile.call_args.kwargs["bio"] is None

    async def test_string_fields_are_trimmed(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Surrounding whitespace is stripped at the API boundary before saving."""
        mock_user_crud.get_by_username = AsyncMock(return_value=None)
        updated = create_mock_user(user_id=1, username="newname")
        mock_user_crud.update_profile = AsyncMock(return_value=updated)

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(
                username="  NewName  ",
                first_name="  Jane  ",
                last_name="  Doe  ",
                bio="  hi there  ",
            ),
        )

        assert response.status_code == 200
        kwargs = mock_user_crud.update_profile.call_args.kwargs
        assert kwargs["username"] == "newname"  # trimmed then lowercased
        assert kwargs["first_name"] == "Jane"
        assert kwargs["last_name"] == "Doe"
        assert kwargs["bio"] == "hi there"

    async def test_blank_first_name_is_rejected(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A whitespace-only first name is trimmed to "" and fails min-length."""
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(first_name="   "),
        )

        assert response.status_code == 422
        mock_user_crud.update_profile.assert_not_called()

    async def test_null_username_returns_422(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A null username is rejected (column is NOT NULL), not crashed."""
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(username=None),
        )

        assert response.status_code == 422
        mock_user_crud.update_profile.assert_not_called()

    async def test_null_first_name_returns_422(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A null first name is rejected (column is NOT NULL)."""
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(first_name=None),
        )

        assert response.status_code == 422
        mock_user_crud.update_profile.assert_not_called()

    async def test_null_show_full_name_returns_422(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """A null show_full_name is rejected (column is NOT NULL)."""
        mock_user_crud.update_profile = AsyncMock()

        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(show_full_name=None),
        )

        assert response.status_code == 422
        mock_user_crud.update_profile.assert_not_called()

    async def test_username_change_is_normalized_to_lowercase(
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
            json=_profile_payload(username="BrandNew"),
        )

        assert response.status_code == 200
        mock_user_crud.get_by_username.assert_called_once()
        assert mock_user_crud.get_by_username.call_args.kwargs["username"] == "brandnew"
        assert mock_user_crud.update_profile.call_args.kwargs["username"] == "brandnew"

    async def test_username_taken_returns_409(
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
            json=_profile_payload(username="Taken"),
        )

        assert response.status_code == 409
        mock_user_crud.update_profile.assert_not_called()

    async def test_same_username_skips_uniqueness_check(
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
            json=_profile_payload(username="TestUser"),
        )

        assert response.status_code == 200
        mock_user_crud.get_by_username.assert_not_called()
        assert mock_user_crud.update_profile.call_args.kwargs["username"] == "testuser"

    async def test_invalid_username_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """A username with illegal characters fails schema validation."""
        response = await async_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(username="bad user!"),
        )

        assert response.status_code == 422

    async def test_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Updating without authentication returns 401."""
        response = await unauthenticated_client.patch(
            "/api/v1/users/me/profile",
            json=_profile_payload(),
        )

        assert response.status_code == 401
