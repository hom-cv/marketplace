"""Integration tests for brand endpoints.

Covers the public list (GET /brands) and the admin add/remove
(POST /brands, DELETE /brands/{slug}), including the admin-only gate.
"""

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import get_current_user, get_current_user_allow_unverified
from app.crud.brand import get_brand_crud
from app.db.utils import get_async_db
from app.main import create_app
from app.models.brand import Brand


@pytest.fixture
async def admin_client(
    mock_brand_crud: MagicMock,
    mock_admin_user: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Async client whose current user is an admin (passes require_admin_user)."""
    app = create_app()
    app.dependency_overrides[get_brand_crud] = lambda: mock_brand_crud
    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    async def override_admin() -> MagicMock:
        return mock_admin_user

    app.dependency_overrides[get_current_user] = override_admin
    app.dependency_overrides[get_current_user_allow_unverified] = override_admin

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


class TestListBrands:
    async def test_returns_brands(
        self,
        async_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        mock_brand_crud.list_brands.return_value = [
            Brand(name="Nike", slug="nike"),
            Brand(name="Adidas", slug="adidas"),
        ]

        response = await async_client.get("/api/v1/brands")

        assert response.status_code == 200
        assert [b["slug"] for b in response.json()] == ["nike", "adidas"]


class TestCreateBrand:
    async def test_admin_creates_brand(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        response = await admin_client.post(
            "/api/v1/brands", json={"name": "Comme des Garçons"}
        )

        assert response.status_code == 201
        body = response.json()
        assert body == {"name": "Comme des Garçons", "slug": "comme-des-gar-ons"}
        _, kwargs = mock_brand_crud.create.call_args
        assert kwargs["slug"] == "comme-des-gar-ons"

    async def test_duplicate_slug_conflicts(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        mock_brand_crud.get_by_slug.return_value = Brand(name="Nike", slug="nike")

        response = await admin_client.post("/api/v1/brands", json={"name": "nike"})

        assert response.status_code == 409
        mock_brand_crud.create.assert_not_called()

    async def test_name_without_alphanumeric_is_rejected(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        response = await admin_client.post("/api/v1/brands", json={"name": "!!!"})

        assert response.status_code == 400
        mock_brand_crud.create.assert_not_called()

    async def test_non_admin_forbidden(
        self,
        async_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        response = await async_client.post("/api/v1/brands", json={"name": "Nike"})

        assert response.status_code == 403
        mock_brand_crud.create.assert_not_called()


class TestDeleteBrand:
    async def test_admin_deletes_brand(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        mock_brand_crud.get_by_slug.return_value = Brand(name="Nike", slug="nike")

        response = await admin_client.delete("/api/v1/brands/nike")

        assert response.status_code == 204
        mock_brand_crud.delete.assert_called_once()

    async def test_catchall_cannot_be_deleted(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        response = await admin_client.delete("/api/v1/brands/other")

        assert response.status_code == 400
        mock_brand_crud.delete.assert_not_called()

    async def test_missing_brand_returns_404(
        self,
        admin_client: AsyncClient,
        mock_brand_crud: MagicMock,
    ) -> None:
        mock_brand_crud.get_by_slug.return_value = None

        response = await admin_client.delete("/api/v1/brands/ghost")

        assert response.status_code == 404
        mock_brand_crud.delete.assert_not_called()
