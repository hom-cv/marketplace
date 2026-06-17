"""Unit tests for checkout validation in PaymentService.

Covers the post-state gates (deleted/banned/sold/own-post) and the
minimum-payout guard. Reuses the fixture pattern from
test_payment_service_waiver.py.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models.payment import PaymentMethod
from app.services.payment_service import PaymentService
from app.services.pricing_service import PricingService

from .test_payment_service_waiver import (
    SHIPPING,
    _make_post,
    _make_seller_profile,
    _make_settings,
    mocks,  # noqa: F401 - fixture re-export
)


@pytest.fixture
def service(mocks):
    settings = _make_settings()
    settings.MIN_PAYOUT_AMOUNT_SATANG = 200
    pricing_service = PricingService(
        db=MagicMock(),
        settings=settings,
        post_crud_dep=MagicMock(),
        seller_crud_dep=MagicMock(),
    )
    svc = PaymentService(
        db=AsyncMock(),
        stripe_service=mocks.stripe_service,
        settings=settings,
        pricing_service=pricing_service,
        post_crud=mocks.post_crud,
        payment_crud=mocks.payment_crud,
        seller_crud=mocks.seller_crud,
    )
    return svc


async def _attempt(service, buyer_id=99):
    buyer = MagicMock()
    buyer.id = buyer_id
    return await service._create_payment_intent(
        buyer=buyer,
        post_id=1,
        shipping=SHIPPING,
        payment_method=PaymentMethod.CARD,
        payment_method_types=["card"],
    )


def _assert_no_side_effects(mocks):
    mocks.payment_crud.create_payment.assert_not_awaited()
    mocks.stripe_service.create_payment_intent.assert_not_awaited()


class TestCheckoutPostValidation:
    async def test_missing_or_deleted_post_404(self, service, mocks):
        mocks.post_crud.get_by_id_with_status.return_value = None
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service)
        assert exc_info.value.status_code == 404
        _assert_no_side_effects(mocks)

    async def test_banned_post_404(self, service, mocks):
        mocks.post_crud.get_by_id_with_status.return_value = (
            _make_post(), True, False, False,
        )
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service)
        assert exc_info.value.status_code == 404
        _assert_no_side_effects(mocks)

    async def test_banned_seller_404(self, service, mocks):
        mocks.post_crud.get_by_id_with_status.return_value = (
            _make_post(), False, True, False,
        )
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service)
        assert exc_info.value.status_code == 404
        _assert_no_side_effects(mocks)

    async def test_own_post_403(self, service, mocks):
        post = _make_post(user_id=99)
        mocks.post_crud.get_by_id_with_status.return_value = (
            post, False, False, False,
        )
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service, buyer_id=99)
        assert exc_info.value.status_code == 403
        _assert_no_side_effects(mocks)

    async def test_sold_post_409(self, service, mocks):
        mocks.post_crud.get_by_id_with_status.return_value = (
            _make_post(), False, False, True,
        )
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service)
        assert exc_info.value.status_code == 409
        _assert_no_side_effects(mocks)


class TestMinPayoutGuard:
    async def test_payout_below_minimum_400(self, service, mocks):
        mocks.seller_crud.get_by_user_id.return_value = _make_seller_profile()
        # Raise the floor above any possible payout for a ฿1000 post.
        service._settings.MIN_PAYOUT_AMOUNT_SATANG = 10_000_000
        with pytest.raises(HTTPException) as exc_info:
            await _attempt(service)
        assert exc_info.value.status_code == 400
        _assert_no_side_effects(mocks)

    async def test_normal_payout_passes(self, service, mocks):
        mocks.seller_crud.get_by_user_id.return_value = _make_seller_profile()
        response = await _attempt(service)
        assert response.payment_id == 7
        mocks.stripe_service.create_payment_intent.assert_awaited_once()
