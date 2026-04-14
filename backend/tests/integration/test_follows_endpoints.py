"""Integration tests for follows endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from unittest.mock import MagicMock

from httpx import AsyncClient

from tests.integration.conftest import create_mock_user


class TestFollowUserEndpoint:
    """Tests for POST /api/v1/follows/{user_id} endpoint."""

    async def test_follow_user_success(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
        mock_follow_crud: MagicMock,
    ):
        """Successfully following a user returns 204 No Content."""
        target_user = create_mock_user(user_id=2, username="targetuser")
        mock_user_crud.get_by_id.return_value = target_user
        mock_follow_crud.follow_user.return_value = MagicMock()

        response = await async_client.post("/api/v1/follows/2")

        assert response.status_code == 204
        assert response.content == b""
        mock_follow_crud.follow_user.assert_called_once()

    async def test_follow_self_returns_400(
        self,
        async_client: AsyncClient,
    ):
        """Following yourself returns 400 Bad Request."""
        # mock_user has id=1, so following user_id=1 is self-follow
        response = await async_client.post("/api/v1/follows/1")

        assert response.status_code == 400

    async def test_follow_nonexistent_user_returns_404(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Following a non-existent user returns 404."""
        mock_user_crud.get_by_id.return_value = None

        response = await async_client.post("/api/v1/follows/99999")

        assert response.status_code == 404

    async def test_follow_deleted_user_returns_404(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
    ):
        """Following a soft-deleted user returns 404."""
        deleted_user = create_mock_user(user_id=2, username="deleted")
        deleted_user.is_deleted = True

        mock_user_crud.get_by_id.return_value = deleted_user

        response = await async_client.post("/api/v1/follows/2")

        assert response.status_code == 404

    async def test_follow_already_following_is_idempotent(
        self,
        async_client: AsyncClient,
        mock_user_crud: MagicMock,
        mock_follow_crud: MagicMock,
    ):
        """Following an already-followed user returns 204 (idempotent)."""
        target_user = create_mock_user(user_id=2, username="targetuser")
        mock_user_crud.get_by_id.return_value = target_user
        # Returns None when already following (ON CONFLICT DO NOTHING)
        mock_follow_crud.follow_user.return_value = None

        response = await async_client.post("/api/v1/follows/2")

        assert response.status_code == 204
        assert response.content == b""

    async def test_follow_user_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Following without authentication returns 401."""
        response = await unauthenticated_client.post("/api/v1/follows/2")

        assert response.status_code == 401


class TestUnfollowUserEndpoint:
    """Tests for DELETE /api/v1/follows/{user_id} endpoint."""

    async def test_unfollow_user_success(
        self,
        async_client: AsyncClient,
        mock_follow_crud: MagicMock,
    ):
        """Successfully unfollowing a user returns 204 No Content."""
        mock_follow_crud.unfollow_user.return_value = True

        response = await async_client.delete("/api/v1/follows/2")

        assert response.status_code == 204
        assert response.content == b""
        mock_follow_crud.unfollow_user.assert_called_once()

    async def test_unfollow_not_following_is_idempotent(
        self,
        async_client: AsyncClient,
        mock_follow_crud: MagicMock,
    ):
        """Unfollowing a user you don't follow returns 204 (idempotent)."""
        mock_follow_crud.unfollow_user.return_value = False

        response = await async_client.delete("/api/v1/follows/2")

        assert response.status_code == 204
        assert response.content == b""

    async def test_unfollow_user_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unfollowing without authentication returns 401."""
        response = await unauthenticated_client.delete("/api/v1/follows/2")

        assert response.status_code == 401
