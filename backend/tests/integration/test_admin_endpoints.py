"""Integration tests for admin user-management endpoints.

Covers the admin users table (GET /admin/users) and admin impersonation
(POST /admin/impersonate/{user_id}), including the admin-only gate.
"""

from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.security import (
    decode_access_token,
    get_current_user,
    get_current_user_allow_unverified,
)
from app.crud.user import get_user_crud
from app.db.utils import get_async_db
from app.main import create_app
from tests.integration.conftest import create_mock_user


@pytest.fixture
async def admin_client(
    mock_user_crud: MagicMock,
    mock_admin_user: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Async client whose current user is an admin (passes require_admin_user)."""
    app = create_app()
    app.dependency_overrides[get_user_crud] = lambda: mock_user_crud
    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    async def override_admin() -> MagicMock:
        return mock_admin_user

    app.dependency_overrides[get_current_user] = override_admin
    app.dependency_overrides[get_current_user_allow_unverified] = override_admin

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()


class TestListUsers:
    async def test_returns_paginated_users(
        self,
        admin_client: AsyncClient,
        mock_user_crud: MagicMock,
    ) -> None:
        users = [
            create_mock_user(user_id=1, username="alice"),
            create_mock_user(user_id=2, username="bob"),
        ]
        mock_user_crud.list_paginated = AsyncMock(return_value=(users, 2))

        response = await admin_client.get("/api/v1/admin/users")

        assert response.status_code == 200
        body = response.json()
        assert body["total"] == 2
        assert [u["username"] for u in body["items"]] == ["alice", "bob"]

    async def test_passes_search_to_crud(
        self,
        admin_client: AsyncClient,
        mock_user_crud: MagicMock,
    ) -> None:
        mock_user_crud.list_paginated = AsyncMock(return_value=([], 0))

        response = await admin_client.get("/api/v1/admin/users?search=ali")

        assert response.status_code == 200
        assert mock_user_crud.list_paginated.call_args.kwargs["search"] == "ali"

    async def test_forbidden_for_non_admin(
        self,
        async_client: AsyncClient,
    ) -> None:
        response = await async_client.get("/api/v1/admin/users")
        assert response.status_code == 403


class TestImpersonate:
    async def test_returns_token_for_target_user(
        self,
        admin_client: AsyncClient,
        mock_user_crud: MagicMock,
    ) -> None:
        target = create_mock_user(user_id=42, username="target")
        mock_user_crud.get_by_id_with_relations = AsyncMock(return_value=target)

        response = await admin_client.post("/api/v1/admin/impersonate/42")

        assert response.status_code == 200
        token = response.json()["access_token"]
        payload = decode_access_token(token)
        assert payload is not None
        assert payload["user_id"] == 42
        assert payload["sub"] == "access"

    async def test_unknown_user_returns_404(
        self,
        admin_client: AsyncClient,
        mock_user_crud: MagicMock,
    ) -> None:
        mock_user_crud.get_by_id_with_relations = AsyncMock(return_value=None)

        response = await admin_client.post("/api/v1/admin/impersonate/999")
        assert response.status_code == 404

    async def test_deleted_user_returns_404(
        self,
        admin_client: AsyncClient,
        mock_user_crud: MagicMock,
    ) -> None:
        target = create_mock_user(user_id=7)
        target.is_deleted = True
        mock_user_crud.get_by_id_with_relations = AsyncMock(return_value=target)

        response = await admin_client.post("/api/v1/admin/impersonate/7")
        assert response.status_code == 404

    async def test_forbidden_for_non_admin(
        self,
        async_client: AsyncClient,
    ) -> None:
        response = await async_client.post("/api/v1/admin/impersonate/1")
        assert response.status_code == 403
