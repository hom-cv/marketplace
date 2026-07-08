"""Integration tests for posts endpoints.

Tests verify request/response handling, validation, and error cases
using mocked CRUDs (allowing real service logic to run).
"""

from decimal import Decimal
from unittest.mock import MagicMock

from httpx import AsyncClient

from app.models.post import Gender, Post, PostType
from tests.integration.conftest import TEST_CDN_URL, create_mock_user


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

    async def test_list_posts_gender_filter_passthrough(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """The Women's department (womens+unisex) is forwarded to the CRUD.

        This pins the department-scope contract: the schema enums from the
        query string are converted to model enums and passed as ``genders``.
        """
        mock_post_crud.get_posts_with_filters.return_value = ([], 0)

        response = await async_client.get(
            "/api/v1/posts?genders=WOMENS&genders=UNISEX"
        )

        assert response.status_code == 200
        _, kwargs = mock_post_crud.get_posts_with_filters.call_args
        assert kwargs["genders"] == [Gender.WOMENS, Gender.UNISEX]

    async def test_list_posts_invalid_gender_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """An unknown gender value is rejected by validation."""
        response = await async_client.get("/api/v1/posts?genders=KIDS")

        assert response.status_code == 422

    async def test_list_posts_brand_and_tag_filters_passthrough(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """`brands` (as brand_slugs) and `tags` are forwarded to the CRUD."""
        mock_post_crud.get_posts_with_filters.return_value = ([], 0)

        response = await async_client.get(
            "/api/v1/posts?brands=nike&brands=adidas&tags=vintage"
        )

        assert response.status_code == 200
        _, kwargs = mock_post_crud.get_posts_with_filters.call_args
        assert kwargs["brand_slugs"] == ["nike", "adidas"]
        assert kwargs["tags"] == ["vintage"]

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
        mock_post.gender = Gender.UNISEX
        mock_post.brand = None
        mock_post.tags = []
        mock_post.price = Decimal("500.00")
        mock_post.shipping_cost = Decimal("50.00")
        mock_post.image_url = None
        mock_post.image_urls = []
        mock_post.size = "M"
        mock_post.measurements = None
        mock_post.user = create_mock_user()
        mock_post.reserved_until = None
        mock_post.reserved_by_payment_id = None
        mock_post.is_reserved = False

        # Configure CRUD to return (post, is_banned, is_user_banned, is_sold)
        mock_post_crud.get_by_id_with_status.return_value = (
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
        # Buyer total = item + shipping + processing fee (buyer-paid).
        assert Decimal(body["total"]) == Decimal("1100") + Decimal(
            body["processing_fee"]
        )
        # Seller receives base minus only the platform fee.
        assert Decimal(body["seller_payout"]) == Decimal("1100") - Decimal(
            body["platform_fee"]
        )

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
        mock_post_crud.get_by_user_id_with_status.return_value = []

        response = await async_client.get("/api/v1/posts/me")

        assert response.status_code == 200
        assert isinstance(response.json(), list)
        # Verify CRUD was called
        mock_post_crud.get_by_user_id_with_status.assert_called_once()

    async def test_get_my_posts_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated request should return 401."""
        response = await unauthenticated_client.get("/api/v1/posts/me")

        assert response.status_code == 401


def _make_mock_post(
    post_id: int = 1,
    owner_id: int = 1,
    image_urls: list[str] | None = None,
) -> MagicMock:
    """Build a mock Post suitable for response serialization."""
    mock_post = MagicMock(spec=Post)
    mock_post.id = post_id
    mock_post.title = "Original Title"
    mock_post.description = "Original description"
    mock_post.type = PostType.SHIRT
    mock_post.gender = Gender.UNISEX
    mock_post.brand = None
    mock_post.tags = []
    mock_post.price = Decimal("500.00")
    mock_post.shipping_cost = Decimal("50.00")
    mock_post.image_url = (image_urls or [None])[0]
    mock_post.image_urls = image_urls if image_urls is not None else []
    mock_post.size = "M"
    mock_post.measurements = None
    mock_post.user_id = owner_id
    mock_post.user = create_mock_user(user_id=owner_id)
    mock_post.reserved_until = None
    mock_post.reserved_by_payment_id = None
    # spec'd mocks don't compute the is_reserved property; pin it.
    mock_post.is_reserved = False
    return mock_post


VALID_UPDATE_JSON = {
    "title": "Updated Title",
    "description": "Updated description",
    "type": "SHIRT",
    "gender": "MENS",
    "price": "600.00",
    "size": "L",
    "image_urls": [],
}


class TestUpdatePostEndpoint:
    """Tests for PUT /api/v1/posts/{post_id} endpoint."""

    async def test_update_post_success_returns_200(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Owner updating a non-sold listing should return 200 with new data."""
        post = _make_mock_post(owner_id=1)
        # Called once for the ownership/sold check, once to build the response.
        mock_post_crud.get_by_id_with_status.side_effect = [
            (post, False, False, False),
            (post, False, False, False),
        ]

        response = await async_client.put("/api/v1/posts/1", json=VALID_UPDATE_JSON)

        assert response.status_code == 200
        body = response.json()
        assert body["title"] == "Updated Title"
        assert body["price"] == "600.00"
        mock_post_crud.update.assert_awaited_once()

    async def test_update_post_not_owner_returns_403(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Non-owner should not be able to edit the listing."""
        post = _make_mock_post(owner_id=999)
        mock_post_crud.get_by_id_with_status.return_value = (
            post,
            False,
            False,
            False,
        )

        response = await async_client.put("/api/v1/posts/1", json=VALID_UPDATE_JSON)

        assert response.status_code == 403
        mock_post_crud.update.assert_not_called()

    async def test_update_post_sold_returns_400(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Sold listings cannot be edited."""
        post = _make_mock_post(owner_id=1)
        mock_post_crud.get_by_id_with_status.return_value = (
            post,
            False,
            False,
            True,  # is_sold
        )

        response = await async_client.put("/api/v1/posts/1", json=VALID_UPDATE_JSON)

        assert response.status_code == 400
        mock_post_crud.update.assert_not_called()

    async def test_update_post_not_found_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Updating a missing post should return 404."""
        mock_post_crud.get_by_id_with_status.return_value = None

        response = await async_client.put("/api/v1/posts/1", json=VALID_UPDATE_JSON)

        assert response.status_code == 404

    async def test_update_post_reorders_images(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """image_urls order is the final order (first = cover)."""
        urls = [
            f"{TEST_CDN_URL}/posts/a.jpg",
            f"{TEST_CDN_URL}/posts/b.jpg",
            f"{TEST_CDN_URL}/posts/c.jpg",
        ]
        post = _make_mock_post(owner_id=1, image_urls=urls)
        mock_post_crud.get_by_id_with_status.side_effect = [
            (post, False, False, False),
            (post, False, False, False),
        ]
        reordered = [urls[2], urls[0], urls[1]]

        response = await async_client.put(
            "/api/v1/posts/1",
            json={**VALID_UPDATE_JSON, "image_urls": reordered},
        )

        assert response.status_code == 200
        body = response.json()
        assert body["image_urls"] == reordered
        assert body["image_url"] == reordered[0]

    async def test_update_post_foreign_image_url_returns_400(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """An image URL outside our CDN should be rejected."""
        post = _make_mock_post(owner_id=1)
        mock_post_crud.get_by_id_with_status.return_value = (
            post,
            False,
            False,
            False,
        )

        response = await async_client.put(
            "/api/v1/posts/1",
            json={**VALID_UPDATE_JSON, "image_urls": ["https://evil.example/x.jpg"]},
        )

        assert response.status_code == 400
        mock_post_crud.update.assert_not_called()

    async def test_update_post_invalid_price_returns_422(
        self,
        async_client: AsyncClient,
    ):
        """Price below the minimum should fail validation."""
        response = await async_client.put(
            "/api/v1/posts/1", json={**VALID_UPDATE_JSON, "price": "1.00"}
        )

        assert response.status_code == 422

    async def test_update_post_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated update should return 401."""
        response = await unauthenticated_client.put(
            "/api/v1/posts/1", json=VALID_UPDATE_JSON
        )

        assert response.status_code == 401


class TestDeletePostEndpoint:
    """Tests for DELETE /api/v1/posts/{post_id} endpoint."""

    async def test_delete_post_success_returns_204(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Owner should be able to soft delete their listing."""
        post = _make_mock_post(owner_id=1)
        mock_post_crud.get_by_id_with_user.return_value = post

        response = await async_client.delete("/api/v1/posts/1")

        assert response.status_code == 204
        mock_post_crud.soft_delete.assert_awaited_once()

    async def test_delete_post_not_owner_returns_403(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Non-owner should not be able to delete the listing."""
        post = _make_mock_post(owner_id=999)
        mock_post_crud.get_by_id_with_user.return_value = post

        response = await async_client.delete("/api/v1/posts/1")

        assert response.status_code == 403
        mock_post_crud.soft_delete.assert_not_called()

    async def test_delete_post_not_found_returns_404(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
    ):
        """Deleting a missing post should return 404."""
        mock_post_crud.get_by_id_with_user.return_value = None

        response = await async_client.delete("/api/v1/posts/1")

        assert response.status_code == 404

    async def test_delete_post_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated delete should return 401."""
        response = await unauthenticated_client.delete("/api/v1/posts/1")

        assert response.status_code == 401


VALID_CREATE_JSON = {
    "title": "New Item",
    "description": "A brand new listing",
    "type": "SHIRT",
    "gender": "MENS",
    "price": "600.00",
    "size": "L",
    "image_urls": [],
}


class TestCreatePostEndpoint:
    """Tests for POST /api/v1/posts endpoint (JSON)."""

    async def test_create_post_success_returns_201(
        self,
        async_client: AsyncClient,
        mock_post_crud: MagicMock,
        mock_user: MagicMock,
    ):
        """A verified seller can create a listing."""
        mock_user.is_seller = True
        mock_post_crud.create_post.return_value = _make_mock_post(owner_id=1)

        response = await async_client.post("/api/v1/posts", json=VALID_CREATE_JSON)

        assert response.status_code == 201
        mock_post_crud.create_post.assert_awaited_once()

    async def test_create_post_non_seller_returns_400(
        self,
        async_client: AsyncClient,
        mock_user: MagicMock,
    ):
        """Non-sellers cannot create listings."""
        mock_user.is_seller = False

        response = await async_client.post("/api/v1/posts", json=VALID_CREATE_JSON)

        assert response.status_code == 400

    async def test_create_post_foreign_image_url_returns_400(
        self,
        async_client: AsyncClient,
        mock_user: MagicMock,
    ):
        """Image URLs outside our CDN are rejected."""
        mock_user.is_seller = True

        response = await async_client.post(
            "/api/v1/posts",
            json={**VALID_CREATE_JSON, "image_urls": ["https://evil.example/x.jpg"]},
        )

        assert response.status_code == 400

    async def test_create_post_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated create should return 401."""
        response = await unauthenticated_client.post(
            "/api/v1/posts", json=VALID_CREATE_JSON
        )

        assert response.status_code == 401


class TestPresignUploadEndpoint:
    """Tests for POST /api/v1/posts/uploads/presign endpoint."""

    async def test_presign_success_returns_urls(
        self,
        async_client: AsyncClient,
        mock_user: MagicMock,
    ):
        """A verified seller gets an upload URL and a public file URL."""
        mock_user.is_seller = True

        response = await async_client.post(
            "/api/v1/posts/uploads/presign",
            json={"content_type": "image/jpeg"},
        )

        assert response.status_code == 200
        body = response.json()
        assert "upload_url" in body
        assert body["file_url"].startswith(TEST_CDN_URL)

    async def test_presign_non_seller_returns_400(
        self,
        async_client: AsyncClient,
        mock_user: MagicMock,
    ):
        """Non-sellers cannot request upload URLs."""
        mock_user.is_seller = False

        response = await async_client.post(
            "/api/v1/posts/uploads/presign",
            json={"content_type": "image/jpeg"},
        )

        assert response.status_code == 400

    async def test_presign_unauthorized_returns_401(
        self,
        unauthenticated_client: AsyncClient,
    ):
        """Unauthenticated presign should return 401."""
        response = await unauthenticated_client.post(
            "/api/v1/posts/uploads/presign",
            json={"content_type": "image/jpeg"},
        )

        assert response.status_code == 401
