"""Unit tests for the checkout reservation flow in PaymentService.

Covers the three-phase _create_payment_intent (claim before Stripe create,
takeover of stale reservations, fail-closed Stripe cancel handling) and the
buyer-initiated cancel_payment. CRUD singletons and StripeService are mocked;
a real PricingService (mock settings) exercises the fee math.
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import stripe
from fastapi import HTTPException

from app.models.payment import PaymentMethod, PaymentStatus
from app.schemas.payment import ShippingAddress
from app.services.payment_service import (
    ALREADY_SOLD_DETAIL,
    RESERVED_BY_OTHER_DETAIL,
    PaymentService,
)
from app.services.pricing_service import PricingService

from .test_payment_service_waiver import (
    _make_post,
    _make_seller_profile,
    _make_settings,
)

BUYER_ID = 99
OTHER_BUYER_ID = 123

SHIPPING = ShippingAddress(
    name="Buyer",
    phone="0800000000",
    address="1 Test Rd",
    district="District",
    province="Bangkok",
    postal_code="10100",
)


def _future():
    return datetime.now(timezone.utc) + timedelta(minutes=5)


def _past():
    return datetime.now(timezone.utc) - timedelta(minutes=5)


def _make_holder_payment(
    *,
    id=55,
    buyer_id=OTHER_BUYER_ID,
    status=PaymentStatus.PENDING,
    stripe_payment_intent_id="pi_old",
):
    holder = MagicMock()
    holder.id = id
    holder.buyer_id = buyer_id
    holder.status = status
    holder.stripe_payment_intent_id = stripe_payment_intent_id
    return holder


def _reserve_post(post, holder):
    post.reserved_by_payment_id = holder.id
    post.reserved_until = _future()


@pytest.fixture
def mocks(monkeypatch):
    import app.services.payment_service as mod

    post = _make_post()
    post.reserved_until = None
    post.reserved_by_payment_id = None

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
        get_by_id_with_status=AsyncMock(return_value=(post, False, False, False)),
        try_reserve=AsyncMock(return_value=True),
        release_reservation=AsyncMock(),
    )
    seller_crud = SimpleNamespace(
        get_by_user_id=AsyncMock(return_value=_make_seller_profile())
    )

    monkeypatch.setattr(mod, "payment_crud", payment_crud)
    monkeypatch.setattr(mod, "post_crud", post_crud)
    monkeypatch.setattr(mod, "seller_crud", seller_crud)

    stripe_service = MagicMock()
    intent = MagicMock()
    intent.id = "pi_new"
    intent.client_secret = "pi_new_secret"
    stripe_service.create_payment_intent = AsyncMock(return_value=intent)
    stripe_service.cancel_payment_intent = AsyncMock()
    stripe_service.retrieve_payment_intent = AsyncMock()

    return SimpleNamespace(
        post=post,
        payment_crud=payment_crud,
        post_crud=post_crud,
        seller_crud=seller_crud,
        stripe_service=stripe_service,
        created_payment=created_payment,
    )


@pytest.fixture
def service(mocks):
    settings = _make_settings()
    settings.RESERVATION_DURATION_MINUTES = 10
    pricing_service = PricingService(
        db=AsyncMock(), settings=settings, post_crud_dep=MagicMock()
    )
    return PaymentService(
        db=AsyncMock(),
        stripe_service=mocks.stripe_service,
        settings=settings,
        pricing_service=pricing_service,
    )


async def _create(service):
    buyer = MagicMock()
    buyer.id = BUYER_ID
    return await service._create_payment_intent(
        buyer=buyer,
        post_id=1,
        shipping=SHIPPING,
        payment_method=PaymentMethod.CARD,
        payment_method_types=["card"],
    )


def _unexpected_state_error():
    return stripe.InvalidRequestError(
        "Intent is not cancellable",
        param=None,
        code="payment_intent_unexpected_state",
    )


class TestFreshClaim:
    async def test_claims_reservation_with_new_payment(self, service, mocks):
        await _create(service)
        mocks.post_crud.try_reserve.assert_awaited_once_with(
            service.db,
            post_id=1,
            payment_id=7,
            buyer_id=BUYER_ID,
            duration_minutes=10,
        )
        mocks.stripe_service.cancel_payment_intent.assert_not_awaited()

    async def test_claim_commits_before_stripe_create(self, service, mocks):
        order = []
        service.db.commit.side_effect = lambda: order.append("commit")
        original = mocks.stripe_service.create_payment_intent

        async def record_create(**kwargs):
            order.append("stripe_create")
            return await original(**kwargs)

        mocks.stripe_service.create_payment_intent = AsyncMock(
            side_effect=record_create
        )

        await _create(service)

        assert "commit" in order and "stripe_create" in order
        assert order.index("commit") < order.index("stripe_create")

    async def test_lost_claim_rolls_back_and_409s(self, service, mocks):
        mocks.post_crud.try_reserve.return_value = False

        with pytest.raises(HTTPException) as exc_info:
            await _create(service)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == RESERVED_BY_OTHER_DETAIL
        service.db.rollback.assert_awaited_once()
        mocks.stripe_service.create_payment_intent.assert_not_awaited()


class TestActiveReservationByOtherBuyer:
    async def test_409_without_touching_stripe(self, service, mocks):
        holder = _make_holder_payment(buyer_id=OTHER_BUYER_ID)
        _reserve_post(mocks.post, holder)
        mocks.payment_crud.get_by_id.return_value = holder

        with pytest.raises(HTTPException) as exc_info:
            await _create(service)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == RESERVED_BY_OTHER_DETAIL
        mocks.stripe_service.cancel_payment_intent.assert_not_awaited()
        mocks.payment_crud.create_payment.assert_not_awaited()


class TestTakeover:
    async def test_expired_reservation_is_taken_over(self, service, mocks):
        holder = _make_holder_payment()
        _reserve_post(mocks.post, holder)
        mocks.post.reserved_until = _past()
        mocks.payment_crud.get_by_id.return_value = holder
        mocks.payment_crud.get_by_id_for_update.return_value = holder

        await _create(service)

        mocks.stripe_service.cancel_payment_intent.assert_awaited_once_with("pi_old")
        # Old holder locked, then expired, in the claim transaction.
        mocks.payment_crud.get_by_id_for_update.assert_awaited_once_with(
            service.db, id=55
        )
        expire_call = mocks.payment_crud.update_status.await_args_list[0]
        assert expire_call.kwargs["payment"] is holder
        assert expire_call.kwargs["status"] == PaymentStatus.EXPIRED
        mocks.post_crud.try_reserve.assert_awaited_once()

    async def test_same_buyer_active_reservation_is_retried(self, service, mocks):
        # Buyer switches payment method while holding their own reservation.
        holder = _make_holder_payment(buyer_id=BUYER_ID)
        _reserve_post(mocks.post, holder)
        mocks.payment_crud.get_by_id.return_value = holder
        mocks.payment_crud.get_by_id_for_update.return_value = holder

        await _create(service)

        mocks.stripe_service.cancel_payment_intent.assert_awaited_once_with("pi_old")
        mocks.post_crud.try_reserve.assert_awaited_once()

    async def test_holder_without_intent_skips_stripe_cancel(self, service, mocks):
        # Crash window: payment committed before its intent was created.
        holder = _make_holder_payment(stripe_payment_intent_id=None)
        _reserve_post(mocks.post, holder)
        mocks.post.reserved_until = _past()
        mocks.payment_crud.get_by_id.return_value = holder
        mocks.payment_crud.get_by_id_for_update.return_value = holder

        await _create(service)

        mocks.stripe_service.cancel_payment_intent.assert_not_awaited()
        mocks.post_crud.try_reserve.assert_awaited_once()

    async def test_old_holder_no_longer_pending_is_not_expired(self, service, mocks):
        # Failed webhook settled the holder between phases; don't downgrade it.
        holder = _make_holder_payment()
        _reserve_post(mocks.post, holder)
        mocks.post.reserved_until = _past()
        locked_holder = _make_holder_payment(status=PaymentStatus.FAILED)
        mocks.payment_crud.get_by_id.return_value = holder
        mocks.payment_crud.get_by_id_for_update.return_value = locked_holder

        await _create(service)

        expired_calls = [
            c
            for c in mocks.payment_crud.update_status.await_args_list
            if c.kwargs.get("status") == PaymentStatus.EXPIRED
        ]
        assert expired_calls == []


class TestStaleIntentCancelFailures:
    async def _setup_takeover(self, mocks):
        holder = _make_holder_payment()
        _reserve_post(mocks.post, holder)
        mocks.post.reserved_until = _past()
        mocks.payment_crud.get_by_id.return_value = holder
        return holder

    async def test_old_intent_already_paid_409s_sold(self, service, mocks):
        await self._setup_takeover(mocks)
        mocks.stripe_service.cancel_payment_intent.side_effect = (
            _unexpected_state_error()
        )
        retrieved = MagicMock()
        retrieved.status = "succeeded"
        mocks.stripe_service.retrieve_payment_intent.return_value = retrieved

        with pytest.raises(HTTPException) as exc_info:
            await _create(service)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == ALREADY_SOLD_DETAIL
        mocks.payment_crud.create_payment.assert_not_awaited()

    async def test_old_intent_already_canceled_proceeds(self, service, mocks):
        holder = await self._setup_takeover(mocks)
        mocks.payment_crud.get_by_id_for_update.return_value = holder
        mocks.stripe_service.cancel_payment_intent.side_effect = (
            _unexpected_state_error()
        )
        retrieved = MagicMock()
        retrieved.status = "canceled"
        mocks.stripe_service.retrieve_payment_intent.return_value = retrieved

        await _create(service)

        mocks.post_crud.try_reserve.assert_awaited_once()

    async def test_unconfirmable_cancel_fails_closed(self, service, mocks):
        await self._setup_takeover(mocks)
        mocks.stripe_service.cancel_payment_intent.side_effect = stripe.StripeError(
            "transient"
        )

        with pytest.raises(HTTPException) as exc_info:
            await _create(service)

        assert exc_info.value.status_code == 409
        assert exc_info.value.detail == RESERVED_BY_OTHER_DETAIL
        mocks.payment_crud.create_payment.assert_not_awaited()


class TestStripeCreateFailure:
    async def test_releases_reservation_and_fails_payment(self, service, mocks):
        mocks.stripe_service.create_payment_intent.side_effect = stripe.StripeError(
            "card network down"
        )

        with pytest.raises(HTTPException) as exc_info:
            await _create(service)

        assert exc_info.value.status_code == 400
        fail_call = mocks.payment_crud.update_status.await_args
        assert fail_call.kwargs["payment"] is mocks.created_payment
        assert fail_call.kwargs["status"] == PaymentStatus.FAILED
        mocks.post_crud.release_reservation.assert_awaited_once_with(
            service.db, post_id=1, payment_id=7
        )


class TestCancelPayment:
    def _make_own_pending_payment(self):
        payment = MagicMock()
        payment.id = 7
        payment.buyer_id = BUYER_ID
        payment.post_id = 1
        payment.status = PaymentStatus.PENDING
        payment.stripe_payment_intent_id = "pi_new"
        return payment

    def _buyer(self):
        buyer = MagicMock()
        buyer.id = BUYER_ID
        return buyer

    async def test_happy_path_expires_and_releases(self, service, mocks):
        payment = self._make_own_pending_payment()
        mocks.payment_crud.get_by_id.return_value = payment
        mocks.payment_crud.get_by_id_for_update.return_value = payment

        await service.cancel_payment(7, self._buyer())

        mocks.stripe_service.cancel_payment_intent.assert_awaited_once_with("pi_new")
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.EXPIRED
        )
        mocks.post_crud.release_reservation.assert_awaited_once_with(
            service.db, post_id=1, payment_id=7
        )

    async def test_only_buyer_can_cancel(self, service, mocks):
        payment = self._make_own_pending_payment()
        payment.buyer_id = OTHER_BUYER_ID
        mocks.payment_crud.get_by_id.return_value = payment

        with pytest.raises(HTTPException) as exc_info:
            await service.cancel_payment(7, self._buyer())
        assert exc_info.value.status_code == 403
        mocks.stripe_service.cancel_payment_intent.assert_not_awaited()

    async def test_non_pending_payment_409s(self, service, mocks):
        payment = self._make_own_pending_payment()
        payment.status = PaymentStatus.SUCCESSFUL
        mocks.payment_crud.get_by_id.return_value = payment

        with pytest.raises(HTTPException) as exc_info:
            await service.cancel_payment(7, self._buyer())
        assert exc_info.value.status_code == 409
        mocks.stripe_service.cancel_payment_intent.assert_not_awaited()

    async def test_intent_already_paid_409s(self, service, mocks):
        payment = self._make_own_pending_payment()
        mocks.payment_crud.get_by_id.return_value = payment
        mocks.stripe_service.cancel_payment_intent.side_effect = (
            _unexpected_state_error()
        )
        retrieved = MagicMock()
        retrieved.status = "succeeded"
        mocks.stripe_service.retrieve_payment_intent.return_value = retrieved

        with pytest.raises(HTTPException) as exc_info:
            await service.cancel_payment(7, self._buyer())
        assert exc_info.value.status_code == 409
        mocks.payment_crud.update_status.assert_not_awaited()
        mocks.post_crud.release_reservation.assert_not_awaited()

    async def test_settled_between_cancel_and_lock_is_left_alone(
        self, service, mocks
    ):
        # The succeeded webhook won the race after our Stripe cancel attempt.
        payment = self._make_own_pending_payment()
        locked = self._make_own_pending_payment()
        locked.status = PaymentStatus.SUCCESSFUL
        mocks.payment_crud.get_by_id.return_value = payment
        mocks.payment_crud.get_by_id_for_update.return_value = locked

        await service.cancel_payment(7, self._buyer())

        mocks.payment_crud.update_status.assert_not_awaited()
        mocks.post_crud.release_reservation.assert_not_awaited()
        service.db.rollback.assert_awaited_once()
