"""Integration tests for likes endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from decimal import Decimal
from unittest.mock import MagicMock

from app.models.like import Like
from app.models.post import Post, PostType
from httpx import AsyncClient
from tests.integration.conftest import create_mock_user


def create_mock_post(
    post_id: int = 1,
    title: str = "Test Post",
    description: str = "Test description",
    price: Decimal = Decimal("500.00"),
    is_deleted: bool = False,
) -> MagicMock:
    """Factory function to create a mock Post object."""
    mock_post = MagicMock(spec=Post)
    mock_post.id = post_id
    mock_post.title = title
    mock_post.description = description
    mock_post.type = PostType.SHIRT
    mock_post.price = price
    mock_post.shipping_cost = Decimal("50.00")
    mock_post.image_url = None
    mock_post.image_urls = []
    mock_post.size = "M"
    mock_post.measurements = None
    mock_post.user = create_mock_user(user_id=10, username="postowner")
    mock_post.deleted_at = "2024-01-01" if is_deleted else None
    return mock_post


def create_mock_like(user_id: int = 1, post_id: int = 1) -> MagicMock:
    """Factory function to create a mock Like object."""
    mock_like = MagicMock(spec=Like)
    mock_like.id = 1
    mock_like.user_id = user_id
    mock_like.post_id = post_id
    return mock_like


class TestLikePostEndpoint:
    """Tests for POST /api/v1/likes/{post_id} endpoint."""

    async def test_like_post_success(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """Successfully liking a post returns 204 No Content."""
        mock_post = create_mock_post()
        mock_post_crud.get_by_id.return_value = mock_post
        mock_like_crud.like_post.return_value = create_mock_like()

        response = await async_client.post("/api/v1/likes/1")

        assert response.status_code == 204
        assert response.content == b""  # No response body
        mock_like_crud.like_post.assert_called_once()

    async def test_like_post_already_liked_idempotent(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """Liking an already-liked post returns 204 No Content (idempotent)."""
        mock_post = create_mock_post()
        mock_post_crud.get_by_id.return_value = mock_post
        # Returns None when already liked (ON CONFLICT DO NOTHING)
        mock_like_crud.like_post.return_value = None

        response = await async_client.post("/api/v1/likes/1")

        assert response.status_code == 204
        assert response.content == b""

    async def test_like_post_not_found_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Liking a non-existent post returns 404."""
        mock_post_crud.get_by_id.return_value = None

        response = await async_client.post("/api/v1/likes/99999")

        assert response.status_code == 404

    async def test_like_deleted_post_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Liking a deleted post returns 404."""
        mock_post = create_mock_post(is_deleted=True)
        mock_post_crud.get_by_id.return_value = mock_post

        response = await async_client.post("/api/v1/likes/1")

        assert response.status_code == 404

    async def test_like_post_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Liking without authentication returns 401."""
        response = await unauthenticated_client.post("/api/v1/likes/1")

        assert response.status_code == 401


class TestUnlikePostEndpoint:
    """Tests for DELETE /api/v1/likes/{post_id} endpoint."""

    async def test_unlike_post_success(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """Successfully unliking a post returns 204 No Content."""
        mock_post = create_mock_post()
        mock_post_crud.get_by_id.return_value = mock_post
        mock_like_crud.unlike_post.return_value = True

        response = await async_client.delete("/api/v1/likes/1")

        assert response.status_code == 204
        assert response.content == b""  # No response body
        mock_like_crud.unlike_post.assert_called_once()

    async def test_unlike_post_not_liked_idempotent(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """Unliking an already-unliked post returns 204 No Content (idempotent)."""
        mock_post = create_mock_post()
        mock_post_crud.get_by_id.return_value = mock_post
        # Returns False when not found to delete
        mock_like_crud.unlike_post.return_value = False

        response = await async_client.delete("/api/v1/likes/1")

        assert response.status_code == 204
        assert response.content == b""

    async def test_unlike_post_not_found_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Unliking a non-existent post returns 404."""
        mock_post_crud.get_by_id.return_value = None

        response = await async_client.delete("/api/v1/likes/99999")

        assert response.status_code == 404

    async def test_unlike_deleted_post_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Unliking a deleted post returns 404."""
        mock_post = create_mock_post(is_deleted=True)
        mock_post_crud.get_by_id.return_value = mock_post

        response = await async_client.delete("/api/v1/likes/1")

        assert response.status_code == 404

    async def test_unlike_post_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unliking without authentication returns 401."""
        response = await unauthenticated_client.delete("/api/v1/likes/1")

        assert response.status_code == 401


class TestGetMyLikedPostsEndpoint:
    """Tests for GET /api/v1/likes/me endpoint."""

    async def test_get_liked_posts_empty(
        self,
        async_client: AsyncClient,
        mock_like_crud: MagicMock,
    ):
        """Returns empty list when user has no liked posts."""
        mock_like_crud.get_user_liked_posts.return_value = ([], 0)

        response = await async_client.get("/api/v1/likes/me")

        assert response.status_code == 200
        body = response.json()
        assert body["items"] == []
        assert body["total"] == 0
        mock_like_crud.get_user_liked_posts.assert_called_once()

    async def test_get_liked_posts_with_posts(
        self,
        async_client: AsyncClient,
        mock_like_crud: MagicMock,
    ):
        """Returns list of liked posts with like data."""
        mock_posts = [
            create_mock_post(post_id=1, title="Post 1"),
            create_mock_post(post_id=2, title="Post 2"),
        ]
        mock_like_crud.get_user_liked_posts.return_value = (mock_posts, 2)
        mock_like_crud.get_likes_for_posts.return_value = {
            1: {"count": 10, "is_liked": True},
            2: {"count": 5, "is_liked": True},
        }

        response = await async_client.get("/api/v1/likes/me")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 2
        assert body["total"] == 2
        assert body["items"][0]["is_liked"] is True
        assert body["items"][0]["like_count"] == 10
        assert body["items"][1]["like_count"] == 5

    async def test_get_liked_posts_pagination(
        self,
        async_client: AsyncClient,
        mock_like_crud: MagicMock,
    ):
        """Pagination parameters are passed correctly."""
        mock_like_crud.get_user_liked_posts.return_value = ([], 0)

        response = await async_client.get("/api/v1/likes/me?skip=10&limit=25")

        assert response.status_code == 200
        body = response.json()
        assert body["skip"] == 10
        assert body["limit"] == 25

    async def test_get_liked_posts_invalid_skip_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Negative skip should return 422."""
        response = await async_client.get("/api/v1/likes/me?skip=-1")

        assert response.status_code == 422

    async def test_get_liked_posts_invalid_limit_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Limit exceeding max should return 422."""
        response = await async_client.get("/api/v1/likes/me?limit=500")

        assert response.status_code == 422

    async def test_get_liked_posts_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Getting liked posts without authentication returns 401."""
        response = await unauthenticated_client.get("/api/v1/likes/me")

        assert response.status_code == 401


class TestPostsEndpointLikeData:
    """Tests for like data in posts endpoints."""

    async def test_list_posts_includes_like_data(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """List posts should include like_count and is_liked for each post."""
        mock_post = create_mock_post()
        mock_post_crud.get_posts_with_filters.return_value = ([(mock_post, False)], 1)
        mock_like_crud.get_likes_for_posts.return_value = {
            1: {"count": 42, "is_liked": True}
        }

        response = await async_client.get("/api/v1/posts")

        assert response.status_code == 200
        body = response.json()
        assert len(body["items"]) == 1
        assert body["items"][0]["like_count"] == 42
        assert body["items"][0]["is_liked"] is True
        # Verify batch loading was used
        mock_like_crud.get_likes_for_posts.assert_called_once()

    async def test_get_single_post_includes_like_data(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_like_crud: MagicMock,
    ):
        """Get single post should include like_count and is_liked."""
        mock_post = create_mock_post()
        mock_post_crud.get_by_id_with_status.return_value = (
            mock_post,
            False,
            False,
            False,
        )
        mock_like_crud.get_likes_for_posts.return_value = {
            1: {"count": 15, "is_liked": False}
        }

        response = await async_client.get("/api/v1/posts/1")

        assert response.status_code == 200
        body = response.json()
        assert body["like_count"] == 15
        assert body["is_liked"] is False
