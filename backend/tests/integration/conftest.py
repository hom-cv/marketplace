"""Integration test fixtures with mocked services.

Uses FastAPI's dependency_overrides to inject mock services,
avoiding the need for a real database connection.
"""

from datetime import timedelta
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.jwt import create_access_token
from app.core.security import get_current_user
from app.db.utils import get_async_db
from app.main import create_app
from app.models.user import User, UserStatus
from app.schemas.payment import PriceBreakdown
from app.services.auth import AuthService, _get_auth_service
from app.services.listing_service import ListingService, _get_listing_service
from app.services.pricing_service import PricingService, _get_pricing_service


# =============================================================================
# Test Data Factory Functions
# =============================================================================


def create_mock_user(
    user_id: int = 1,
    username: str = "testuser",
    email: str = "test@example.com",
    first_name: str = "Test",
    last_name: str = "User",
    is_seller: bool = False,
    is_admin: bool = False,
    email_verified: bool = True,
) -> MagicMock:
    """Factory function to create a mock User object with configurable attributes."""
    mock_user = MagicMock(spec=User)
    mock_user.id = user_id
    mock_user.username = username
    mock_user.email_address = email
    mock_user.first_name = first_name
    mock_user.last_name = last_name
    mock_user.full_name = f"{first_name} {last_name}"
    mock_user.is_seller = is_seller
    mock_user.is_admin = is_admin
    mock_user.email_verified = email_verified
    mock_user.status = UserStatus.ACTIVE if email_verified else UserStatus.PENDING
    mock_user.hashed_password = "hashed_password_placeholder"
    mock_user.roles = []
    mock_user.seller_profile = None
    return mock_user


def create_mock_price_breakdown(
    item_price: Decimal = Decimal("1000.00"),
    shipping_cost: Decimal = Decimal("100.00"),
) -> PriceBreakdown:
    """Factory function to create a PriceBreakdown for testing."""
    return PriceBreakdown(
        item_price=item_price,
        shipping_cost=shipping_cost,
        platform_fee=Decimal("117.70"),
        processing_fee=Decimal("43.02"),
        total_fees=Decimal("160.72"),
        total_vat=Decimal("10.42"),
        total=item_price + shipping_cost,
        seller_payout=item_price + shipping_cost - Decimal("160.72"),
    )


# =============================================================================
# Mock Service Factories
# =============================================================================


def create_mock_auth_service() -> MagicMock:
    """Create a mock AuthService with async methods."""
    mock_service = MagicMock(spec=AuthService)
    mock_service.register_user = AsyncMock()
    mock_service.login_user = AsyncMock()
    mock_service.verify_email = AsyncMock()
    mock_service.resend_verification_email = AsyncMock()
    return mock_service


def create_mock_pricing_service() -> MagicMock:
    """Create a mock PricingService."""
    mock_service = MagicMock(spec=PricingService)
    mock_service.calculate_order_total = MagicMock(return_value=create_mock_price_breakdown())
    mock_service.get_price_breakdown_for_post = AsyncMock(return_value=create_mock_price_breakdown())
    return mock_service


def create_mock_listing_service() -> MagicMock:
    """Create a mock ListingService."""
    mock_service = MagicMock(spec=ListingService)
    mock_service.get_listing = AsyncMock(return_value=None)
    mock_service.get_my_listings = AsyncMock(return_value=[])
    return mock_service


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_auth_service() -> MagicMock:
    """Fixture for mock AuthService."""
    return create_mock_auth_service()


@pytest.fixture
def mock_pricing_service() -> MagicMock:
    """Fixture for mock PricingService."""
    return create_mock_pricing_service()


@pytest.fixture
def mock_listing_service() -> MagicMock:
    """Fixture for mock ListingService."""
    return create_mock_listing_service()


@pytest.fixture
def mock_user() -> MagicMock:
    """Fixture for a standard mock user."""
    return create_mock_user()


@pytest.fixture
def mock_admin_user() -> MagicMock:
    """Fixture for a mock admin user."""
    return create_mock_user(user_id=2, username="admin", is_admin=True)


@pytest.fixture
def mock_seller_user() -> MagicMock:
    """Fixture for a mock seller user."""
    return create_mock_user(user_id=3, username="seller", is_seller=True)


@pytest.fixture
def valid_auth_token(mock_user: MagicMock) -> str:
    """Generate a valid JWT token for the mock user."""
    return create_access_token(
        data={"user_id": mock_user.id},
        expires_delta=timedelta(hours=1),
    )


@pytest.fixture
def auth_headers(valid_auth_token: str) -> dict[str, str]:
    """Create Authorization headers with valid token."""
    return {"Authorization": f"Bearer {valid_auth_token}"}


@pytest.fixture
async def async_client(
    mock_auth_service: MagicMock,
    mock_pricing_service: MagicMock,
    mock_listing_service: MagicMock,
    mock_user: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with all services mocked."""
    from unittest.mock import patch

    app = create_app()

    # Override service dependencies with mocks
    app.dependency_overrides[_get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[_get_pricing_service] = lambda: mock_pricing_service
    app.dependency_overrides[_get_listing_service] = lambda: mock_listing_service

    # Override database dependency
    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    # Override current user dependency
    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    # Mock post_crud for direct CRUD calls in endpoints
    mock_post_crud = MagicMock()
    mock_post_crud.get_posts_with_filters = AsyncMock(return_value=([], 0))

    with patch("app.api.endpoints.v1.posts.post_crud", mock_post_crud):
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            yield client

    # Cleanup
    app.dependency_overrides.clear()


@pytest.fixture
async def unauthenticated_client(
    mock_auth_service: MagicMock,
    mock_pricing_service: MagicMock,
    mock_listing_service: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client without auth override (for testing 401s)."""
    app = create_app()

    # Override service dependencies
    app.dependency_overrides[_get_auth_service] = lambda: mock_auth_service
    app.dependency_overrides[_get_pricing_service] = lambda: mock_pricing_service
    app.dependency_overrides[_get_listing_service] = lambda: mock_listing_service
    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
