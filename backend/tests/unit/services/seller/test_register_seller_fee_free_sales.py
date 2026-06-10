"""Unit tests: seller registration copies invite fee-free sale credits."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.seller import SellerVerificationRequest
from app.services.seller_service import SellerService


@pytest.fixture
def crud(monkeypatch):
    import app.services.seller_service as mod

    seller_crud = SimpleNamespace(
        get_by_user_id=AsyncMock(return_value=None),
        create_seller_profile=AsyncMock(),
    )
    monkeypatch.setattr(mod, "seller_crud", seller_crud)
    return seller_crud


class TestRegisterSellerCopiesCredits:
    async def test_invite_credits_copied_to_profile(self, crud):
        invite = MagicMock()
        invite.fee_free_sales = 5

        invite_service = MagicMock()
        invite_service.validate_and_consume = AsyncMock(return_value=invite)

        account = MagicMock()
        account.id = "acct_1"
        link = MagicMock()
        link.url = "https://connect.stripe.com/setup"
        stripe_service = MagicMock()
        stripe_service.create_connect_account = AsyncMock(return_value=account)
        stripe_service.create_account_link = AsyncMock(return_value=link)

        settings = MagicMock()
        settings.STRIPE_CONNECT_RETURN_URL = "http://localhost/return"
        settings.STRIPE_CONNECT_REFRESH_URL = "http://localhost/refresh"

        service = SellerService(
            db=AsyncMock(),
            stripe_service=stripe_service,
            invite_service=invite_service,
            settings=settings,
        )

        user = MagicMock()
        user.id = 10
        user.email_address = "seller@example.com"

        await service.register_seller(
            user, SellerVerificationRequest(invite_code="ABCD2345")
        )

        kwargs = crud.create_seller_profile.await_args.kwargs
        assert kwargs["fee_free_sales_remaining"] == 5
        assert kwargs["user_id"] == 10
        assert kwargs["stripe_account_id"] == "acct_1"
