"""Integration tests for posts endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from decimal import Decimal
from unittest.mock import MagicMock

from app.models.post import Post, PostType
from httpx import AsyncClient
from tests.integration.conftest import create_mock_user


class TestListPostsEndpoint:
    """Tests for GET /api/v1/posts endpoint."""

    async def test_list_posts_returns_200(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """List posts should return 200 with paginated response."""
        # Configure mock CRUD to return empty list
        mock_post_crud.get_posts_with_filters.return_value = ([], 0)

        response = await async_client.get("/api/v1/posts")

        assert response.status_code == 200
        body = response.json()
        assert "items" in body
        assert "total" in body
        assert body["total"] == 0
        # Verify CRUD was called (service layer ran)
        mock_post_crud.get_posts_with_filters.assert_called_once()

    async def test_list_posts_pagination_params(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """List posts should accept skip and limit params."""
        mock_post_crud.get_posts_with_filters.return_value = ([], 0)

        response = await async_client.get("/api/v1/posts?skip=10&limit=25")

        assert response.status_code == 200
        body = response.json()
        assert body["skip"] == 10
        assert body["limit"] == 25

    async def test_list_posts_invalid_skip_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Negative skip should return 422."""
        response = await async_client.get("/api/v1/posts?skip=-1")

        assert response.status_code == 422

    async def test_list_posts_invalid_limit_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Limit exceeding max should return 422."""
        response = await async_client.get("/api/v1/posts?limit=500")

        assert response.status_code == 422


class TestGetPostEndpoint:
    """Tests for GET /api/v1/posts/{post_id} endpoint."""

    async def test_get_post_not_found_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Non-existent post should return 404."""
        mock_post_crud.get_by_id_with_status.return_value = None

        response = await async_client.get("/api/v1/posts/99999")

        assert response.status_code == 404

    async def test_get_post_success_returns_post(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Existing post should return post data."""
        # Create mock post with correct type
        mock_post = MagicMock(spec=Post)
        mock_post.id = 1
        mock_post.title = "Test Post"
        mock_post.description = "A test post description"
        mock_post.type = PostType.SHIRT  # Use actual enum
        mock_post.price = Decimal("500.00")
        mock_post.shipping_cost = Decimal("50.00")
        mock_post.image_url = None
        mock_post.image_urls = []
        mock_post.size = "M"
        mock_post.measurements = None
        mock_post.user = create_mock_user()

        # Configure CRUD to return (post, is_banned, is_user_banned, is_sold)
        mock_post_crud.get_by_id_with_ban_status.return_value = (
            mock_post,
            False,
            False,
            False,
        )

        response = await async_client.get("/api/v1/posts/1")

        assert response.status_code == 200
        body = response.json()
        assert body["id"] == 1
        assert body["title"] == "Test Post"


class TestPreviewEarningsEndpoint:
    """Tests for GET /api/v1/posts/preview/earnings endpoint."""

    async def test_preview_earnings_returns_breakdown(
        self,
        async_client: AsyncClient,
    ):
        """Preview earnings should return price breakdown."""
        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=1000&shipping_cost=100"
        )

        assert response.status_code == 200
        body = response.json()
        assert "item_price" in body
        assert "shipping_cost" in body
        assert "seller_payout" in body
        assert "total" in body
        # Verify real calculation was done (total = item + shipping)
        assert Decimal(body["total"]) == Decimal("1100")

    async def test_preview_earnings_default_shipping_zero(
        self,
        async_client: AsyncClient,
    ):
        """Shipping cost should default to zero."""
        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=500"
        )

        assert response.status_code == 200
        body = response.json()
        assert body["shipping_cost"] == "0"

    async def test_preview_earnings_invalid_price_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Zero or negative price should return 422."""
        response = await async_client.get("/api/v1/posts/preview/earnings?item_price=0")

        assert response.status_code == 422

    async def test_preview_earnings_price_too_high_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Price exceeding max should return 422."""
        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=9999999"
        )

        assert response.status_code == 422

    async def test_preview_earnings_card_payment_method(
        self,
        async_client: AsyncClient,
    ):
        """Card payment method should be accepted."""
        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=500&payment_method=card"
        )

        assert response.status_code == 200

    async def test_preview_earnings_promptpay_payment_method(
        self,
        async_client: AsyncClient,
    ):
        """PromptPay payment method should be accepted."""
        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=500&payment_method=promptpay"
        )

        assert response.status_code == 200


class TestGetMyPostsEndpoint:
    """Tests for GET /api/v1/posts/me endpoint."""

    async def test_get_my_posts_returns_list(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """My posts should return list of user's posts."""
        mock_post_crud.get_by_user_id_with_ban_status.return_value = []

        response = await async_client.get("/api/v1/posts/me")

        assert response.status_code == 200
        assert isinstance(response.json(), list)
        # Verify CRUD was called
        mock_post_crud.get_by_user_id_with_ban_status.assert_called_once()

    async def test_get_my_posts_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated request should return 401."""
        response = await unauthenticated_client.get("/api/v1/posts/me")

        assert response.status_code == 401
