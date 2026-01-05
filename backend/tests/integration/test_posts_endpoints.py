"""Integration tests for posts endpoints.

Tests verify request/response handling, validation, and error cases
using mocked services (no real database).
"""

from decimal import Decimal
from unittest.mock import MagicMock

import pytest
from httpx import AsyncClient

from app.schemas.post import PostResponseSchema
from app.schemas.user import UserResponseSchema
from tests.integration.conftest import create_mock_price_breakdown


class TestListPostsEndpoint:
    """Tests for GET /api/v1/posts endpoint."""

    async def test_list_posts_returns_200(
        self,
        async_client: AsyncClient,
    ):
        """List posts should return 200 with paginated response."""
        response = await async_client.get("/api/v1/posts")

        assert response.status_code == 200
        body = response.json()
        assert "items" in body
        assert "total" in body
        assert "skip" in body
        assert "limit" in body

    async def test_list_posts_pagination_params(
        self,
        async_client: AsyncClient,
    ):
        """List posts should accept skip and limit params."""
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
        mock_listing_service: MagicMock,
    ):
        """Non-existent post should return 404."""
        mock_listing_service.get_listing.return_value = None

        response = await async_client.get("/api/v1/posts/99999")

        assert response.status_code == 404

    async def test_get_post_success_returns_post(
        self,
        async_client: AsyncClient,
        mock_listing_service: MagicMock,
    ):
        """Existing post should return post data."""
        mock_user = UserResponseSchema(
            id=1,
            username="testuser",
            first_name="Test",
            last_name="User",
            email_address="test@example.com",
            email_verified=True,
            is_seller=False,
            seller_status=None,
            is_admin=False,
        )
        mock_post = PostResponseSchema(
            id=1,
            title="Test Post",
            description="A test post description",
            type="SHIRT",
            price=Decimal("500.00"),
            shipping_cost=Decimal("50.00"),
            image_url=None,
            image_urls=[],
            user=mock_user,
            is_sold=False,
            is_banned=False,
            is_user_banned=False,
        )
        mock_listing_service.get_listing.return_value = mock_post

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
        mock_pricing_service: MagicMock,
    ):
        """Preview earnings should return price breakdown."""
        mock_pricing_service.calculate_order_total.return_value = create_mock_price_breakdown(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("100.00"),
        )

        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=1000&shipping_cost=100"
        )

        assert response.status_code == 200
        body = response.json()
        assert "item_price" in body
        assert "shipping_cost" in body
        assert "seller_payout" in body
        assert "total" in body

    async def test_preview_earnings_default_shipping_zero(
        self,
        async_client: AsyncClient,
        mock_pricing_service: MagicMock,
    ):
        """Shipping cost should default to zero."""
        mock_pricing_service.calculate_order_total.return_value = create_mock_price_breakdown()

        response = await async_client.get("/api/v1/posts/preview/earnings?item_price=500")

        assert response.status_code == 200
        mock_pricing_service.calculate_order_total.assert_called_once()

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
        response = await async_client.get("/api/v1/posts/preview/earnings?item_price=9999999")

        assert response.status_code == 422

    async def test_preview_earnings_card_payment_method(
        self,
        async_client: AsyncClient,
        mock_pricing_service: MagicMock,
    ):
        """Card payment method should be accepted."""
        mock_pricing_service.calculate_order_total.return_value = create_mock_price_breakdown()

        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=500&payment_method=card"
        )

        assert response.status_code == 200

    async def test_preview_earnings_promptpay_payment_method(
        self,
        async_client: AsyncClient,
        mock_pricing_service: MagicMock,
    ):
        """PromptPay payment method should be accepted."""
        mock_pricing_service.calculate_order_total.return_value = create_mock_price_breakdown()

        response = await async_client.get(
            "/api/v1/posts/preview/earnings?item_price=500&payment_method=promptpay"
        )

        assert response.status_code == 200


class TestGetMyPostsEndpoint:
    """Tests for GET /api/v1/posts/me endpoint."""

    async def test_get_my_posts_returns_list(
        self,
        async_client: AsyncClient,
        mock_listing_service: MagicMock,
    ):
        """My posts should return list of user's posts."""
        mock_listing_service.get_my_listings.return_value = []

        response = await async_client.get("/api/v1/posts/me")

        assert response.status_code == 200
        assert isinstance(response.json(), list)

    async def test_get_my_posts_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated request should return 401."""
        response = await unauthenticated_client.get("/api/v1/posts/me")

        assert response.status_code == 401
