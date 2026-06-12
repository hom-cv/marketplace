"""Unit tests for StripeWebhookService handlers.

CRUDs are mocked (AsyncMock) and the session is an AsyncMock, so these tests
cover the handlers' branch/guard logic and transaction discipline:
commit on mutating paths, no commit on early returns.
"""

import pytest
import stripe
from fastapi import HTTPException

from app.models.payment import PaymentStatus
from app.models.seller import SellerVerificationStatus

from .conftest import (
    make_account,
    make_charge,
    make_dispute,
    make_event,
    make_payment,
    make_payment_intent,
    make_seller_profile,
)


class TestProcessWebhookDispatch:
    async def test_unknown_event_is_noop(self, service, mocks):
        await service.process_account_event(
            make_event(type="invoice.created", data_object={})
        )
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_account_event_routes_to_handler(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        intent = make_payment_intent()
        await service.process_account_event(
            make_event(type="payment_intent.succeeded", data_object=intent)
        )
        mocks.payment_crud.update_status.assert_awaited_once()

    async def test_deauth_dispatches_event_account_not_data_object(self, service, mocks):
        # data.object is the Application; the account id lives on event.account.
        seller = make_seller_profile(
            verification_status=SellerVerificationStatus.VERIFIED,
            charges_enabled=True,
        )
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = seller
        event = make_event(
            type="account.application.deauthorized",
            data_object={"id": "ca_app"},
            account="acct_9",
        )
        await service.process_connect_event(event)
        mocks.seller_crud.get_by_stripe_account_id_for_update.assert_awaited_once_with(
            service.db, stripe_account_id="acct_9"
        )

    async def test_account_endpoint_ignores_connect_events(self, service, mocks):
        # A connect-scoped event arriving on the account endpoint is a no-op,
        # not a mis-dispatch.
        await service.process_account_event(
            make_event(type="account.updated", data_object=make_account())
        )
        mocks.seller_crud.update_verification_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_connect_endpoint_ignores_account_events(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service.process_connect_event(
            make_event(
                type="payment_intent.succeeded", data_object=make_payment_intent()
            )
        )
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0


class TestPaymentIntentSucceeded:
    async def test_pending_to_successful(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        args = mocks.payment_crud.update_status.await_args
        assert args.kwargs["status"] == PaymentStatus.SUCCESSFUL
        # One commit for the sale, one closing the defensive-cancel read txn.
        assert service.db.commit.await_count == 2

    async def test_idempotent_already_successful(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.SUCCESSFUL)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_no_walk_back_from_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.REFUNDED)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_does_not_clear_disputed(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.DISPUTED)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_platform_intent_not_found_raises_for_redelivery(
        self, service, mocks
    ):
        # Our intent (payment_id metadata) with no visible row -> non-2xx so
        # Stripe redelivers instead of dropping the event (never retries 2xx).
        with pytest.raises(HTTPException) as exc_info:
            await service._handle_payment_intent_succeeded(
                make_payment_intent(metadata={"payment_id": "7"})
            )
        assert exc_info.value.status_code == 404
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_foreign_intent_is_acked_not_retried(self, service, mocks):
        # No payment_id metadata -> dashboard/foreign intent; ack with 200 so
        # Stripe doesn't retry it for days against our failure rate.
        await service._handle_payment_intent_succeeded(
            make_payment_intent(metadata={})
        )
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_waived_payment_consumes_fee_free_credit(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(
                status=PaymentStatus.PENDING,
                platform_fee_waived=True,
                seller_id=42,
            )
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.seller_crud.decrement_fee_free_sales.assert_awaited_once_with(
            service.db, user_id=42
        )
        assert service.db.commit.await_count == 2

    async def test_non_waived_payment_does_not_touch_credits(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING, platform_fee_waived=False)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.seller_crud.decrement_fee_free_sales.assert_not_awaited()

    async def test_redelivery_does_not_double_decrement(self, service, mocks):
        # Already SUCCESSFUL -> early return before the decrement.
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.SUCCESSFUL, platform_fee_waived=True)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.seller_crud.decrement_fee_free_sales.assert_not_awaited()
        assert service.db.commit.await_count == 0


class TestPaymentIntentSucceededReservation:
    async def test_success_locks_post_and_clears_reservation(self, service, mocks):
        payment = make_payment(status=PaymentStatus.PENDING, post_id=5)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.post_crud.get_by_id_for_update.assert_awaited_once_with(
            service.db, id=5
        )
        mocks.post_crud.clear_reservation.assert_awaited_once_with(
            service.db, post_id=5
        )

    async def test_sold_to_other_refunds_loser(self, service, mocks):
        payment = make_payment(status=PaymentStatus.PENDING, post_id=5, id=2)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        mocks.payment_crud.exists_successful_for_post.return_value = True
        await service._handle_payment_intent_succeeded(make_payment_intent())

        refund_kwargs = mocks.stripe_service.create_refund.await_args.kwargs
        assert refund_kwargs["reverse_transfer"] is True
        assert refund_kwargs["refund_application_fee"] is True
        assert refund_kwargs["idempotency_key"] == "refund-2"
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.REFUNDED
        )
        # The losing payment must not consume promo credit or clear the
        # winner's (already cleared) reservation.
        mocks.seller_crud.decrement_fee_free_sales.assert_not_awaited()
        mocks.post_crud.clear_reservation.assert_not_awaited()
        assert service.db.commit.await_count == 1

    async def test_refund_failure_reraises_for_redelivery(self, service, mocks):
        payment = make_payment(status=PaymentStatus.PENDING, post_id=5)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        mocks.payment_crud.exists_successful_for_post.return_value = True
        mocks.stripe_service.create_refund.side_effect = stripe.StripeError("boom")

        with pytest.raises(stripe.StripeError):
            await service._handle_payment_intent_succeeded(make_payment_intent())
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_expired_payment_paid_on_unsold_post_is_honored(
        self, service, mocks
    ):
        # A stale QR paid at the last moment: money moved, post unsold -> sale.
        payment = make_payment(status=PaymentStatus.EXPIRED, post_id=5)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        await service._handle_payment_intent_succeeded(make_payment_intent())
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.SUCCESSFUL
        )

    async def test_other_pending_intents_cancelled_best_effort(self, service, mocks):
        payment = make_payment(status=PaymentStatus.PENDING, post_id=5, id=1)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        mocks.payment_crud.get_pending_with_intent_by_post.return_value = [
            make_payment(id=2, stripe_payment_intent_id="pi_other_1"),
            make_payment(id=3, stripe_payment_intent_id="pi_other_2"),
        ]
        # First cancel blows up; the second must still be attempted.
        mocks.stripe_service.cancel_payment_intent.side_effect = [
            stripe.StripeError("already paid"),
            None,
        ]
        await service._handle_payment_intent_succeeded(make_payment_intent())

        cancelled = [
            c.args[0]
            for c in mocks.stripe_service.cancel_payment_intent.await_args_list
        ]
        assert cancelled == ["pi_other_1", "pi_other_2"]
        mocks.payment_crud.get_pending_with_intent_by_post.assert_awaited_once_with(
            service.db, post_id=5, exclude_payment_id=1
        )


class TestPaymentIntentFailed:
    async def test_pending_to_failed_with_error(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        intent = make_payment_intent(
            last_payment_error={"code": "card_declined", "message": "Declined"}
        )
        await service._handle_payment_intent_failed(intent)
        kwargs = mocks.payment_crud.update_status.await_args.kwargs
        assert kwargs["status"] == PaymentStatus.FAILED
        assert kwargs["failure_code"] == "card_declined"
        assert kwargs["failure_message"] == "Declined"
        assert service.db.commit.await_count == 1

    async def test_failed_with_no_error_object(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service._handle_payment_intent_failed(
            make_payment_intent(last_payment_error=None)
        )
        kwargs = mocks.payment_crud.update_status.await_args.kwargs
        assert kwargs["failure_code"] is None
        assert kwargs["failure_message"] is None

    async def test_error_object_without_code_uses_none(self, service, mocks):
        # getattr safety: an error object missing 'code' must not raise.
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service._handle_payment_intent_failed(
            make_payment_intent(last_payment_error={"message": "Declined"})
        )
        kwargs = mocks.payment_crud.update_status.await_args.kwargs
        assert kwargs["failure_code"] is None
        assert kwargs["failure_message"] == "Declined"

    async def test_platform_intent_not_found_raises_for_redelivery(
        self, service, mocks
    ):
        with pytest.raises(HTTPException) as exc_info:
            await service._handle_payment_intent_failed(
                make_payment_intent(metadata={"payment_id": "7"})
            )
        assert exc_info.value.status_code == 404
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_foreign_intent_is_acked_not_retried(self, service, mocks):
        await service._handle_payment_intent_failed(
            make_payment_intent(metadata={})
        )
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_no_downgrade_from_terminal(self, service, mocks):
        for terminal in (
            PaymentStatus.SUCCESSFUL,
            PaymentStatus.REFUNDED,
            PaymentStatus.DISPUTED,
            PaymentStatus.FAILED,
            # EXPIRED: we cancelled the intent ourselves and already handled
            # the reservation; the canceled event must not touch the payment.
            PaymentStatus.EXPIRED,
        ):
            mocks.payment_crud.update_status.reset_mock()
            mocks.post_crud.release_reservation.reset_mock()
            mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
                make_payment(status=terminal)
            )
            await service._handle_payment_intent_failed(make_payment_intent())
            mocks.payment_crud.update_status.assert_not_awaited()
            mocks.post_crud.release_reservation.assert_not_awaited()

    async def test_failed_releases_reservation_in_same_txn(self, service, mocks):
        payment = make_payment(status=PaymentStatus.PENDING, post_id=5, id=3)
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        await service._handle_payment_intent_failed(make_payment_intent())
        mocks.post_crud.release_reservation.assert_awaited_once_with(
            service.db, post_id=5, payment_id=3
        )
        assert service.db.commit.await_count == 1


class TestFindPaymentForIntent:
    async def test_resolves_by_intent_id(self, service, mocks):
        payment = make_payment()
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        result = await service._find_payment_for_intent(make_payment_intent(id="pi_1"))
        assert result is payment
        mocks.payment_crud.get_by_payment_intent_id_for_update.assert_awaited_once_with(
            service.db, payment_intent_id="pi_1"
        )

    async def test_not_found_returns_none(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = None
        result = await service._find_payment_for_intent(make_payment_intent())
        assert result is None


class TestChargeRefunded:
    async def test_successful_to_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.SUCCESSFUL)
        )
        await service._handle_charge_refunded(make_charge())
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.REFUNDED
        )
        assert service.db.commit.await_count == 1

    async def test_idempotent_already_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.REFUNDED)
        )
        await service._handle_charge_refunded(make_charge())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_no_payment_intent_on_charge(self, service, mocks):
        await service._handle_charge_refunded(make_charge(payment_intent=None))
        mocks.payment_crud.get_by_payment_intent_id_for_update.assert_not_awaited()
        mocks.payment_crud.update_status.assert_not_awaited()


class TestChargeDisputeCreated:
    async def test_successful_to_disputed(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.SUCCESSFUL)
        )
        await service._handle_charge_dispute_created(make_dispute(status="needs_response"))
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.DISPUTED
        )
        assert service.db.commit.await_count == 1

    async def test_idempotent_already_disputed(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.DISPUTED)
        )
        await service._handle_charge_dispute_created(make_dispute())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_refunded_not_overwritten(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.REFUNDED)
        )
        await service._handle_charge_dispute_created(make_dispute())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_unexpected_status_warns_no_update(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service._handle_charge_dispute_created(make_dispute())
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_no_payment_intent_on_dispute(self, service, mocks):
        await service._handle_charge_dispute_created(make_dispute(payment_intent=None))
        mocks.payment_crud.get_by_payment_intent_id_for_update.assert_not_awaited()


class TestChargeDisputeClosed:
    async def test_lost_to_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.DISPUTED)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="lost"))
        assert (
            mocks.payment_crud.update_status.await_args.kwargs["status"]
            == PaymentStatus.REFUNDED
        )
        assert service.db.commit.await_count == 1

    async def test_lost_idempotent_when_already_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.REFUNDED)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="lost"))
        mocks.payment_crud.update_status.assert_not_awaited()

    async def test_won_restores_from_disputed(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.DISPUTED)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="won"))
        mocks.payment_crud.restore_to_successful.assert_awaited_once()
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 1

    async def test_won_noop_when_not_disputed(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.SUCCESSFUL)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="won"))
        mocks.payment_crud.restore_to_successful.assert_not_awaited()

    async def test_won_does_not_resurrect_refunded(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.REFUNDED)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="won"))
        mocks.payment_crud.restore_to_successful.assert_not_awaited()

    async def test_warning_closed_no_change(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.DISPUTED)
        )
        await service._handle_charge_dispute_closed(make_dispute(status="warning_closed"))
        mocks.payment_crud.update_status.assert_not_awaited()
        mocks.payment_crud.restore_to_successful.assert_not_awaited()


class TestAccountUpdated:
    async def test_fully_onboarded_verifies(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.PENDING
        )
        await service._handle_account_updated(make_account())
        assert (
            mocks.seller_crud.update_verification_status.await_args.kwargs["status"]
            == SellerVerificationStatus.VERIFIED
        )

    async def test_pending_rejected_on_terminal_reason(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.PENDING
        )
        await service._handle_account_updated(
            make_account(charges_enabled=False, disabled_reason="rejected.fraud")
        )
        assert (
            mocks.seller_crud.update_verification_status.await_args.kwargs["status"]
            == SellerVerificationStatus.REJECTED
        )

    async def test_pending_transient_reason_no_change(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.PENDING
        )
        await service._handle_account_updated(
            make_account(charges_enabled=False, disabled_reason="requirements.past_due")
        )
        mocks.seller_crud.update_verification_status.assert_not_awaited()

    async def test_verified_seller_is_rejected(self, service, mocks):
        # Regression: a previously VERIFIED seller flagged by Stripe must be
        # rejected, not ignored by a status guard.
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = (
            make_seller_profile(verification_status=SellerVerificationStatus.VERIFIED)
        )
        await service._handle_account_updated(
            make_account(charges_enabled=False, disabled_reason="rejected.fraud")
        )
        assert (
            mocks.seller_crud.update_verification_status.await_args.kwargs["status"]
            == SellerVerificationStatus.REJECTED
        )

    async def test_already_rejected_is_idempotent(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = (
            make_seller_profile(verification_status=SellerVerificationStatus.REJECTED)
        )
        await service._handle_account_updated(
            make_account(charges_enabled=False, disabled_reason="rejected.fraud")
        )
        mocks.seller_crud.update_verification_status.assert_not_awaited()

    async def test_verified_seller_reverts_to_pending_when_onboarding_lapses(
        self, service, mocks
    ):
        # Capability lost (not fully onboarded) with no rejection → back to PENDING.
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = (
            make_seller_profile(verification_status=SellerVerificationStatus.VERIFIED)
        )
        await service._handle_account_updated(make_account(charges_enabled=False))
        assert (
            mocks.seller_crud.update_verification_status.await_args.kwargs["status"]
            == SellerVerificationStatus.PENDING
        )

    async def test_missing_requirements_does_not_raise(self, service, mocks):
        # getattr safety: account with no `requirements` field must not crash.
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = (
            make_seller_profile(verification_status=SellerVerificationStatus.PENDING)
        )
        account = stripe.Account.construct_from(
            {
                "id": "acct_1",
                "charges_enabled": False,
                "payouts_enabled": False,
                "details_submitted": False,
            },
            key=None,
        )
        await service._handle_account_updated(account)
        mocks.seller_crud.update_verification_status.assert_not_awaited()

    async def test_seller_not_found(self, service, mocks):
        await service._handle_account_updated(make_account())
        mocks.seller_crud.update_verification_status.assert_not_awaited()


class TestAccountDeauthorized:
    async def test_disables_and_rejects_verified_seller(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.VERIFIED,
            charges_enabled=True,
            payouts_enabled=True,
            details_submitted=True,
        )
        await service._handle_account_deauthorized("acct_1")
        acct_kwargs = mocks.seller_crud.update_account_status.await_args.kwargs
        assert acct_kwargs["charges_enabled"] is False
        assert acct_kwargs["payouts_enabled"] is False
        verif_kwargs = mocks.seller_crud.update_verification_status.await_args.kwargs
        assert verif_kwargs["status"] == SellerVerificationStatus.REJECTED
        assert verif_kwargs["rejection_reason"] == "account_deauthorized"
        assert service.db.commit.await_count == 1

    async def test_idempotent_when_already_disabled(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id_for_update.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.REJECTED,
            charges_enabled=False,
            payouts_enabled=False,
        )
        await service._handle_account_deauthorized("acct_1")
        mocks.seller_crud.update_account_status.assert_not_awaited()
        mocks.seller_crud.update_verification_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_seller_not_found(self, service, mocks):
        await service._handle_account_deauthorized("acct_unknown")
        mocks.seller_crud.update_verification_status.assert_not_awaited()

    async def test_none_account_id_noop(self, service, mocks):
        await service._handle_account_deauthorized(None)
        mocks.seller_crud.get_by_stripe_account_id_for_update.assert_not_awaited()
