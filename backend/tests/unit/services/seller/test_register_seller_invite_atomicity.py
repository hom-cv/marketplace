"""Regression test: a Stripe failure during seller registration must not
create a seller profile or commit anything in register_seller itself.

Note: the invite redemption commits inside validate_and_consume (mocked
here), so a Stripe failure does burn the code — an accepted trade-off,
since Stripe failures are rare and an admin can reissue a code."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import stripe
from fastapi import HTTPException

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


class TestStripeFailureCleanup:
    async def test_stripe_failure_does_not_create_profile_or_commit(self, crud):
        invite = MagicMock()
        invite.fee_free_sales = 0

        invite_service = MagicMock()
        invite_service.validate_and_consume = AsyncMock(return_value=invite)

        stripe_service = MagicMock()
        stripe_service.create_connect_account = AsyncMock(
            side_effect=stripe.StripeError("connection error")
        )

        db = AsyncMock()
        service = SellerService(
            db=db,
            stripe_service=stripe_service,
            invite_service=invite_service,
            settings=MagicMock(),
        )

        user = MagicMock()
        user.id = 10
        user.email_address = "seller@example.com"

        with pytest.raises(HTTPException) as exc_info:
            await service.register_seller(
                user, SellerVerificationRequest(invite_code="ABCD2345")
            )

        assert exc_info.value.status_code == 400
        invite_service.validate_and_consume.assert_awaited_once()
        crud.create_seller_profile.assert_not_awaited()
        assert db.commit.await_count == 0
