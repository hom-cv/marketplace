"""Unit tests for StripeWebhookService handlers.

CRUDs are mocked (AsyncMock) and the session is an AsyncMock, so these tests
cover the handlers' branch/guard logic and transaction discipline:
commit on mutating paths, no commit on early returns.
"""

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
        await service.process_webhook(make_event(type="invoice.created", data_object={}))
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0

    async def test_known_event_routes_to_handler(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        intent = make_payment_intent()
        await service.process_webhook(
            make_event(type="payment_intent.succeeded", data_object=intent)
        )
        mocks.payment_crud.update_status.assert_awaited_once()

    async def test_deauth_dispatches_event_account_not_data_object(self, service, mocks):
        # data.object is the Application; the account id lives on event.account.
        seller = make_seller_profile(
            verification_status=SellerVerificationStatus.VERIFIED,
            charges_enabled=True,
        )
        mocks.seller_crud.get_by_stripe_account_id.return_value = seller
        event = make_event(
            type="account.application.deauthorized",
            data_object={"id": "ca_app"},
            account="acct_9",
        )
        await service.process_webhook(event)
        mocks.seller_crud.get_by_stripe_account_id.assert_awaited_once_with(
            service.db, stripe_account_id="acct_9"
        )


class TestPaymentIntentSucceeded:
    async def test_pending_to_successful(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
            make_payment(status=PaymentStatus.PENDING)
        )
        await service._handle_payment_intent_succeeded(make_payment_intent())
        args = mocks.payment_crud.update_status.await_args
        assert args.kwargs["status"] == PaymentStatus.SUCCESSFUL
        assert service.db.commit.await_count == 1

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

    async def test_payment_not_found(self, service, mocks):
        # primary lookup misses, no metadata -> None
        await service._handle_payment_intent_succeeded(make_payment_intent(metadata={}))
        mocks.payment_crud.update_status.assert_not_awaited()
        assert service.db.commit.await_count == 0


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

    async def test_no_downgrade_from_terminal(self, service, mocks):
        for terminal in (
            PaymentStatus.SUCCESSFUL,
            PaymentStatus.REFUNDED,
            PaymentStatus.DISPUTED,
            PaymentStatus.FAILED,
        ):
            mocks.payment_crud.update_status.reset_mock()
            mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = (
                make_payment(status=terminal)
            )
            await service._handle_payment_intent_failed(make_payment_intent())
            mocks.payment_crud.update_status.assert_not_awaited()


class TestFindPaymentForIntent:
    async def test_primary_lookup_used(self, service, mocks):
        payment = make_payment()
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = payment
        result = await service._find_payment_for_intent(make_payment_intent())
        assert result is payment
        mocks.payment_crud.get_by_id_for_update.assert_not_awaited()

    async def test_fallback_to_metadata_and_backfill(self, service, mocks):
        mocks.payment_crud.get_by_payment_intent_id_for_update.return_value = None
        payment = make_payment(stripe_payment_intent_id=None)
        mocks.payment_crud.get_by_id_for_update.return_value = payment
        intent = make_payment_intent(id="pi_xyz", metadata={"payment_id": "7"})

        result = await service._find_payment_for_intent(intent)

        mocks.payment_crud.get_by_id_for_update.assert_awaited_once_with(service.db, id=7)
        assert result is payment
        assert payment.stripe_payment_intent_id == "pi_xyz"  # backfilled
        assert service.db.flush.await_count == 1

    async def test_no_metadata_returns_none(self, service, mocks):
        result = await service._find_payment_for_intent(make_payment_intent(metadata={}))
        assert result is None
        mocks.payment_crud.get_by_id_for_update.assert_not_awaited()

    async def test_non_int_payment_id_returns_none(self, service, mocks):
        result = await service._find_payment_for_intent(
            make_payment_intent(metadata={"payment_id": "not-an-int"})
        )
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
    async def test_fully_onboarded_verifies_and_assigns_role(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.PENDING
        )
        mocks.user_crud.get_by_id_with_relations.return_value = object()
        await service._handle_account_updated(make_account())
        assert (
            mocks.seller_crud.update_verification_status.await_args.kwargs["status"]
            == SellerVerificationStatus.VERIFIED
        )
        mocks.seller_crud.assign_seller_role.assert_awaited_once()

    async def test_pending_rejected_on_terminal_reason(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id.return_value = make_seller_profile(
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
        mocks.seller_crud.get_by_stripe_account_id.return_value = make_seller_profile(
            verification_status=SellerVerificationStatus.PENDING
        )
        await service._handle_account_updated(
            make_account(charges_enabled=False, disabled_reason="requirements.past_due")
        )
        mocks.seller_crud.update_verification_status.assert_not_awaited()

    async def test_seller_not_found(self, service, mocks):
        await service._handle_account_updated(make_account())
        mocks.seller_crud.update_verification_status.assert_not_awaited()


class TestAccountDeauthorized:
    async def test_disables_and_rejects_verified_seller(self, service, mocks):
        mocks.seller_crud.get_by_stripe_account_id.return_value = make_seller_profile(
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
        mocks.seller_crud.get_by_stripe_account_id.return_value = make_seller_profile(
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
        mocks.seller_crud.get_by_stripe_account_id.assert_not_awaited()
