"""Unit tests for the founding-seller fee waiver in PaymentService.

Uses a real PricingService (mock settings) so the fee math is exercised, and
patches the module-level CRUD singletons and StripeService.
"""

from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.payment import PaymentMethod
from app.models.seller import SellerVerificationStatus
from app.schemas.payment import ShippingAddress
from app.services.payment_service import PaymentService
from app.services.pricing_service import PricingService


def _make_settings():
    settings = MagicMock()
    settings.PLATFORM_FEE_PERCENT = Decimal("10.0")
    settings.VAT_PERCENT = Decimal("7.0")
    settings.CARD_PROCESSING_FEE_PERCENT = Decimal("3.65")
    settings.CARD_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    settings.PROMPTPAY_PROCESSING_FEE_PERCENT = Decimal("2.0")
    settings.PROMPTPAY_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    settings.PROCESSING_FEE_VAT_PERCENT = Decimal("7.0")
    settings.MIN_PAYOUT_AMOUNT_SATANG = 200
    return settings


def _make_post(*, user_id=10, price=Decimal("1000.00")):
    post = MagicMock()
    post.id = 1
    post.user_id = user_id
    post.title = "Test item"
    post.price = price
    post.shipping_cost = Decimal("0.00")
    post.reserved_until = None
    post.reserved_by_payment_id = None
    return post


def _make_seller_profile(*, fee_free_sales_remaining=0):
    profile = MagicMock()
    profile.user_id = 10
    profile.verification_status = SellerVerificationStatus.VERIFIED
    profile.stripe_account_id = "acct_1"
    profile.charges_enabled = True
    profile.payouts_enabled = True
    profile.fee_free_sales_remaining = fee_free_sales_remaining
    return profile


SHIPPING = ShippingAddress(
    name="Buyer",
    phone="0800000000",
    address="1 Test Rd",
    district="District",
    province="Bangkok",
    postal_code="10100",
)


@pytest.fixture
def mocks(monkeypatch):
    import app.services.payment_service as mod

    created_payment = MagicMock()
    created_payment.id = 7
    created_payment.status.value = "PENDING"

    payment_crud = SimpleNamespace(
        create_payment=AsyncMock(return_value=created_payment),
        get_by_id=AsyncMock(return_value=None),
        get_by_id_for_update=AsyncMock(return_value=None),
        update_status=AsyncMock(),
    )
    post_crud = SimpleNamespace(
        get_by_id_with_status=AsyncMock(
            return_value=(_make_post(), False, False, False)
        ),
        try_reserve=AsyncMock(return_value=True),
        release_reservation=AsyncMock(),
    )
    seller_crud = SimpleNamespace(get_by_user_id=AsyncMock(return_value=None))

    monkeypatch.setattr(mod, "payment_crud", payment_crud)
    monkeypatch.setattr(mod, "post_crud", post_crud)
    monkeypatch.setattr(mod, "seller_crud", seller_crud)

    stripe_service = MagicMock()
    intent = MagicMock()
    intent.id = "pi_1"
    intent.client_secret = "pi_1_secret"
    stripe_service.create_payment_intent = AsyncMock(return_value=intent)

    return SimpleNamespace(
        payment_crud=payment_crud,
        post_crud=post_crud,
        seller_crud=seller_crud,
        stripe_service=stripe_service,
        created_payment=created_payment,
    )


@pytest.fixture
def service(mocks):
    settings = _make_settings()
    pricing_service = PricingService(
        db=AsyncMock(), settings=settings, post_crud_dep=MagicMock()
    )
    return PaymentService(
        db=AsyncMock(),
        stripe_service=mocks.stripe_service,
        settings=settings,
        pricing_service=pricing_service,
    )


async def _create(service, payment_method=PaymentMethod.CARD):
    buyer = MagicMock()
    buyer.id = 99
    return await service._create_payment_intent(
        buyer=buyer,
        post_id=1,
        shipping=SHIPPING,
        payment_method=payment_method,
        payment_method_types=["card"],
    )


class TestPlatformFeeWaiverAtCheckout:
    async def test_credits_remaining_waives_platform_fee(self, service, mocks):
        mocks.seller_crud.get_by_user_id.return_value = _make_seller_profile(
            fee_free_sales_remaining=2
        )

        await _create(service)

        create_kwargs = mocks.payment_crud.create_payment.await_args.kwargs
        assert create_kwargs["platform_fee_waived"] is True
        assert create_kwargs["platform_fee"] == 0
        # Card processing on ฿1000, grossed up: 51.78 -> 5178 satang (buyer-paid)
        assert create_kwargs["processing_fee"] == 5178
        # Platform fee waived -> seller receives the full ฿1000 base
        assert create_kwargs["seller_payout"] == 100000

        intent_kwargs = mocks.stripe_service.create_payment_intent.await_args.kwargs
        # Application fee = processing only when waived
        assert intent_kwargs["application_fee_amount"] == 5178

    async def test_no_credits_charges_normal_fees(self, service, mocks):
        mocks.seller_crud.get_by_user_id.return_value = _make_seller_profile(
            fee_free_sales_remaining=0
        )

        await _create(service)

        create_kwargs = mocks.payment_crud.create_payment.await_args.kwargs
        assert create_kwargs["platform_fee_waived"] is False
        # Platform ฿107 + processing ฿51.78 (grossed up)
        assert create_kwargs["platform_fee"] == 10700
        assert create_kwargs["processing_fee"] == 5178
        # Seller only shoulders the platform fee: ฿1000 - ฿107 = ฿893
        assert create_kwargs["seller_payout"] == 89300

        intent_kwargs = mocks.stripe_service.create_payment_intent.await_args.kwargs
        assert intent_kwargs["application_fee_amount"] == 10700 + 5178

    async def test_buyer_amount_unchanged_by_waiver(self, service, mocks):
        mocks.seller_crud.get_by_user_id.return_value = _make_seller_profile(
            fee_free_sales_remaining=1
        )

        await _create(service)

        intent_kwargs = mocks.stripe_service.create_payment_intent.await_args.kwargs
        # Buyer pays base ฿1000 + grossed-up card processing ฿51.78 = ฿1051.78
        assert intent_kwargs["amount"] == 105178
