"""Integration test fixtures with mocked CRUDs.

Uses FastAPI's dependency_overrides to inject mock CRUDs,
allowing the real service layer to be tested while mocking database access.
This provides maximum coverage of the service business logic.
"""

from datetime import timedelta
from decimal import Decimal
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from app.core.jwt import create_access_token
from app.core.security import get_current_user
from app.core.settings import Settings, get_settings
from app.crud.follow import FollowCRUD, get_follow_crud
from app.crud.like import LikeCRUD, get_like_crud
from app.crud.payment import PaymentCRUD, get_payment_crud
from app.crud.post import PostCRUD, get_post_crud
from app.crud.user import UserCRUD, get_user_crud
from app.db.utils import get_async_db
from app.main import create_app
from app.models.user import User, UserStatus
from app.schemas.payment import PaymentMethodType, PriceBreakdown
from app.services.email_service import EmailService, _get_email_service
from app.services.pricing_service import PricingService
from app.services.storage_service import StorageService, _get_storage_service

# =============================================================================
# Test Data Factory Functions
# =============================================================================


def _create_test_pricing_service() -> PricingService:
    """Create a PricingService with realistic test settings."""
    mock_settings = MagicMock()
    mock_settings.PLATFORM_FEE_PERCENT = Decimal("10.0")
    mock_settings.VAT_PERCENT = Decimal("7.0")
    mock_settings.CARD_PROCESSING_FEE_PERCENT = Decimal("3.65")
    mock_settings.CARD_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    mock_settings.PROMPTPAY_PROCESSING_FEE_PERCENT = Decimal("1.65")
    mock_settings.PROMPTPAY_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    mock_settings.PROCESSING_FEE_VAT_PERCENT = Decimal("7.0")
    mock_settings.TRANSFER_FEE = Decimal("30.0")
    return PricingService(db=AsyncMock(), settings=mock_settings, post_crud_dep=MagicMock())


def create_mock_user(
    user_id: int = 1,
    username: str = "testuser",
    email: str = "test@example.com",
    first_name: str = "Test",
    last_name: str = "User",
    is_seller: bool = False,
    is_admin: bool = False,
    email_verified: bool = True,
    bio: str | None = None,
    show_full_name: bool = True,
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
    mock_user.hashed_password = "$2b$12$abcdefghij1234567890123456789012345678901234567890"  # bcrypt format
    mock_user.roles = []
    mock_user.seller_profile = None
    mock_user.bio = bio
    mock_user.show_full_name = show_full_name
    mock_user.is_deleted = False
    mock_user.deleted_at = None
    return mock_user


def create_mock_price_breakdown(
    item_price: Decimal = Decimal("1000.00"),
    shipping_cost: Decimal = Decimal("100.00"),
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """Factory function to create a realistic PriceBreakdown using the actual service."""
    pricing_service = _create_test_pricing_service()
    return pricing_service.calculate_order_total(item_price, shipping_cost, payment_method)


# =============================================================================
# Mock CRUD Factories
# =============================================================================


def create_mock_user_crud() -> MagicMock:
    """Create a mock UserCRUD with async methods."""
    mock_crud = MagicMock(spec=UserCRUD)
    mock_crud.get_by_email = AsyncMock(return_value=None)
    mock_crud.get_by_username = AsyncMock(return_value=None)
    mock_crud.get_by_id = AsyncMock(return_value=None)
    mock_crud.get_by_id_with_relations = AsyncMock(return_value=None)
    mock_crud.create_user = AsyncMock()
    mock_crud.update_email_verified = AsyncMock()
    return mock_crud


async def _apply_post_update(db, *, db_obj, obj_in):
    """Mimic BaseCRUD.update: copy obj_in fields onto db_obj."""
    for field, value in obj_in.model_dump(exclude_unset=True).items():
        setattr(db_obj, field, value)
    return db_obj


def create_mock_post_crud() -> MagicMock:
    """Create a mock PostCRUD with async methods."""
    mock_crud = MagicMock(spec=PostCRUD)
    mock_crud.get_posts_with_filters = AsyncMock(return_value=([], 0))
    mock_crud.get_by_id = AsyncMock(return_value=None)
    mock_crud.get_by_id_with_user = AsyncMock(return_value=None)
    mock_crud.get_by_id_with_status = AsyncMock(return_value=None)
    mock_crud.get_by_user_id_with_status = AsyncMock(return_value=[])
    mock_crud.create_post = AsyncMock()
    mock_crud.update = AsyncMock(side_effect=_apply_post_update)
    mock_crud.soft_delete = AsyncMock()
    return mock_crud


def create_mock_payment_crud() -> MagicMock:
    """Create a mock PaymentCRUD with async methods."""
    mock_crud = MagicMock(spec=PaymentCRUD)
    mock_crud.get_payments_by_buyer = AsyncMock(return_value=[])
    mock_crud.get_payments_by_seller = AsyncMock(return_value=[])
    mock_crud.create_payment = AsyncMock()
    mock_crud.update_status = AsyncMock()
    return mock_crud


def create_mock_like_crud() -> MagicMock:
    """Create a mock LikeCRUD with async methods."""
    mock_crud = MagicMock(spec=LikeCRUD)
    mock_crud.like_post = AsyncMock(return_value=None)
    mock_crud.unlike_post = AsyncMock(return_value=False)
    mock_crud.check_if_liked = AsyncMock(return_value=False)
    mock_crud.get_like_count = AsyncMock(return_value=0)
    mock_crud.get_likes_for_posts = AsyncMock(return_value={})
    mock_crud.get_user_liked_posts = AsyncMock(return_value=([], 0))
    return mock_crud


def create_mock_follow_crud() -> MagicMock:
    """Create a mock FollowCRUD with async methods."""
    mock_crud = MagicMock(spec=FollowCRUD)
    mock_crud.follow_user = AsyncMock(return_value=None)
    mock_crud.unfollow_user = AsyncMock(return_value=False)
    mock_crud.is_following = AsyncMock(return_value=False)
    mock_crud.get_follower_count = AsyncMock(return_value=0)
    return mock_crud


def create_mock_email_service() -> MagicMock:
    """Create a mock EmailService."""
    mock_service = MagicMock(spec=EmailService)
    mock_service.send_verification_email.return_value = True
    return mock_service


def create_mock_storage_service() -> MagicMock:
    """Create a mock StorageService with async methods (no real network/boto3)."""
    mock_service = MagicMock(spec=StorageService)
    mock_service.upload_image = AsyncMock(return_value=None)
    mock_service.upload_images = AsyncMock(return_value=[])
    mock_service.delete_image = AsyncMock(return_value=None)
    return mock_service


def create_mock_settings() -> MagicMock:
    """Create mock application settings."""
    mock_settings = MagicMock(spec=Settings)
    mock_settings.PLATFORM_FEE_PERCENT = Decimal("10.0")
    mock_settings.VAT_PERCENT = Decimal("7.0")
    mock_settings.CARD_PROCESSING_FEE_PERCENT = Decimal("3.65")
    mock_settings.CARD_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    mock_settings.PROMPTPAY_PROCESSING_FEE_PERCENT = Decimal("1.65")
    mock_settings.PROMPTPAY_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    mock_settings.PROCESSING_FEE_VAT_PERCENT = Decimal("7.0")
    mock_settings.TRANSFER_FEE = Decimal("30.0")
    return mock_settings


# =============================================================================
# Fixtures
# =============================================================================


@pytest.fixture
def mock_user_crud() -> MagicMock:
    """Fixture for mock UserCRUD."""
    return create_mock_user_crud()


@pytest.fixture
def mock_post_crud() -> MagicMock:
    """Fixture for mock PostCRUD."""
    return create_mock_post_crud()


@pytest.fixture
def mock_payment_crud() -> MagicMock:
    """Fixture for mock PaymentCRUD."""
    return create_mock_payment_crud()


@pytest.fixture
def mock_like_crud() -> MagicMock:
    """Fixture for mock LikeCRUD."""
    return create_mock_like_crud()


@pytest.fixture
def mock_follow_crud() -> MagicMock:
    """Fixture for mock FollowCRUD."""
    return create_mock_follow_crud()


@pytest.fixture
def mock_email_service() -> MagicMock:
    """Fixture for mock EmailService."""
    return create_mock_email_service()


@pytest.fixture
def mock_storage_service() -> MagicMock:
    """Provide a mock StorageService."""
    return create_mock_storage_service()


@pytest.fixture
def mock_settings() -> MagicMock:
    """Fixture for mock Settings."""
    return create_mock_settings()


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
    mock_user_crud: MagicMock,
    mock_post_crud: MagicMock,
    mock_payment_crud: MagicMock,
    mock_like_crud: MagicMock,
    mock_follow_crud: MagicMock,
    mock_email_service: MagicMock,
    mock_storage_service: MagicMock,
    mock_settings: MagicMock,
    mock_user: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client with all CRUDs mocked via dependency injection.

    This allows the real service layer code to run while mocking database access,
    providing maximum test coverage of business logic.
    """
    app = create_app()

    # Override CRUD dependencies (centralized providers from CRUD modules)
    app.dependency_overrides[get_user_crud] = lambda: mock_user_crud
    app.dependency_overrides[get_post_crud] = lambda: mock_post_crud
    app.dependency_overrides[get_payment_crud] = lambda: mock_payment_crud
    app.dependency_overrides[get_like_crud] = lambda: mock_like_crud
    app.dependency_overrides[get_follow_crud] = lambda: mock_follow_crud

    # Override external services
    app.dependency_overrides[_get_email_service] = lambda: mock_email_service
    app.dependency_overrides[_get_storage_service] = lambda: mock_storage_service
    app.dependency_overrides[get_settings] = lambda: mock_settings

    # Override database dependency
    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    # Override current user dependency
    async def override_get_current_user():
        return mock_user

    app.dependency_overrides[get_current_user] = override_get_current_user

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    # Cleanup
    app.dependency_overrides.clear()


@pytest.fixture
async def unauthenticated_client(
    mock_user_crud: MagicMock,
    mock_post_crud: MagicMock,
    mock_payment_crud: MagicMock,
    mock_like_crud: MagicMock,
    mock_follow_crud: MagicMock,
    mock_email_service: MagicMock,
    mock_storage_service: MagicMock,
    mock_settings: MagicMock,
) -> AsyncGenerator[AsyncClient, None]:
    """Create an async test client without auth override (for testing 401s)."""
    app = create_app()

    # Override CRUD dependencies (centralized providers)
    app.dependency_overrides[get_user_crud] = lambda: mock_user_crud
    app.dependency_overrides[get_post_crud] = lambda: mock_post_crud
    app.dependency_overrides[get_payment_crud] = lambda: mock_payment_crud
    app.dependency_overrides[get_like_crud] = lambda: mock_like_crud
    app.dependency_overrides[get_follow_crud] = lambda: mock_follow_crud

    # Override external services
    app.dependency_overrides[_get_email_service] = lambda: mock_email_service
    app.dependency_overrides[_get_storage_service] = lambda: mock_storage_service
    app.dependency_overrides[get_settings] = lambda: mock_settings

    app.dependency_overrides[get_async_db] = lambda: AsyncMock()

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client

    app.dependency_overrides.clear()
