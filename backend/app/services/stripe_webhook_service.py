"""Stripe webhook verification, dispatch, and event handlers.

`verify_event` checks the signature and builds the Event; the dispatchers
(`process_account_event` / `process_connect_event`) route already-trusted
events to handlers that apply their effects to the database. All handlers are
idempotent — Stripe may redeliver the same event and we must converge to the
same state regardless of order or duplication.
"""

import logging
from typing import Annotated

import stripe
from fastapi import Depends, HTTPException, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.stripe import (
    ACCOUNT_WEBHOOK_EVENT_HANDLER_MAP,
    CONNECT_WEBHOOK_EVENT_HANDLER_MAP,
)
from app.core.exceptions import not_found_error
from app.crud.payment import AnnotatedPaymentCRUD, PaymentCRUD
from app.crud.post import AnnotatedPostCRUD, PostCRUD
from app.crud.seller import AnnotatedSellerCRUD, SellerCRUD
from app.db.utils import get_async_db
from app.models.payment import Payment, PaymentStatus
from app.models.seller import SellerVerificationStatus
from app.services.stripe_service import AnnotatedStripeService, StripeService

logger = logging.getLogger(__name__)


class StripeWebhookService:
    """Service for handling Stripe webhook events."""

    def __init__(
        self,
        db: AsyncSession,
        stripe_service: StripeService,
        post_crud: PostCRUD,
        payment_crud: PaymentCRUD,
        seller_crud: SellerCRUD,
    ) -> None:
        self.db = db
        self.stripe_service = stripe_service
        self._post_crud = post_crud
        self._payment_crud = payment_crud
        self._seller_crud = seller_crud

    async def verify_event(
        self, request: Request, secret: str | None
    ) -> stripe.Event:
        """Read the request body and verify a Stripe webhook signature.

        Both webhook endpoints delegate here; only the signing secret differs
        between them. Raises HTTP 500 if the secret is unconfigured and HTTP 400
        on an invalid payload or signature.

        Args:
            request: The incoming webhook request.
            secret: The signing secret for this endpoint's scope.

        Returns:
            The verified Stripe Event.
        """
        if not secret:
            logger.error(
                "Stripe webhook secret is not configured — rejecting webhook"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Webhook secret not configured",
            )

        payload = await request.body()
        sig_header = request.headers.get("Stripe-Signature", "")

        try:
            return stripe.Webhook.construct_event(payload, sig_header, secret)
        except ValueError as e:
            logger.warning(f"Webhook payload parse error: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid payload",
            ) from e
        except stripe.SignatureVerificationError as e:
            logger.warning("Webhook signature verification failed")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid signature",
            ) from e

    async def process_account_event(self, event: stripe.Event) -> None:
        """Process a platform-account webhook event (payment_intent.*, charge.*).

        Verified upstream with ``STRIPE_WEBHOOK_SECRET``.
        """
        await self._dispatch(event, ACCOUNT_WEBHOOK_EVENT_HANDLER_MAP)

    async def process_connect_event(self, event: stripe.Event) -> None:
        """Process a Connect webhook event for connected accounts (account.*).

        Verified upstream with ``STRIPE_CONNECT_WEBHOOK_SECRET``.
        """
        await self._dispatch(event, CONNECT_WEBHOOK_EVENT_HANDLER_MAP)

    async def _dispatch(
        self, event: stripe.Event, handler_map: dict[str, str]
    ) -> None:
        """
        Route a verified Stripe event to its handler via ``handler_map``.

        An event type absent from the given map is ignored — this is also what
        keeps the two endpoints isolated: a connect event arriving on the
        account endpoint (or vice versa) is a no-op rather than mis-handled.

        All handlers are idempotent: Stripe may redeliver the same event
        multiple times and we must converge to the same state regardless of
        order or duplication.

        Args:
            event: Verified Stripe Event object.
            handler_map: Event-type → handler-name map for this endpoint's scope.
        """
        event_type = event.type
        logger.info(f"Processing Stripe webhook: {event_type}")

        if not event_type:
            return

        data_object = event.data.object

        handler_name = handler_map.get(event_type)
        if not handler_name:
            logger.debug(f"Unhandled Stripe event: {event_type}")
            return

        handler = getattr(self, f"_handle_{handler_name}")
        if event_type == "account.application.deauthorized":
            # The connected account id is on event.account for this event, not
            # on the data object (which is the deauthorized Application).
            await handler(event.account)
        else:
            await handler(data_object)

    async def _find_payment_for_intent(
        self, intent: stripe.PaymentIntent
    ) -> Payment | None:
        """
        Look up the (row-locked) Payment for a PaymentIntent webhook payload.

        Resolved solely by ``stripe_payment_intent_id``. The payment row
        commits (with the post reservation) just before the intent is created,
        and the intent id commits in a follow-up transaction (see
        ``PaymentService._create_payment_intent``), so there is a brief window
        where the row exists without its intent id. A webhook arriving inside
        it misses the lookup and falls into ``_require_payment_for_intent``'s
        metadata policy: ``payment_id`` metadata present → 404 → Stripe
        redelivers after the id has committed.
        """
        return await self._payment_crud.get_by_payment_intent_id_for_update(
            self.db, payment_intent_id=intent.id
        )

    async def _require_payment_for_intent(
        self, intent: stripe.PaymentIntent
    ) -> Payment | None:
        """
        Look up the Payment for a payment_intent.* event, applying the
        missing-row policy.

        Platform-created intents always carry ``payment_id`` in metadata
        (set in ``PaymentService._create_payment_intent``), so:
        - No ``payment_id`` metadata → dashboard-created/foreign intent.
          Return None; the caller acks with 200 so Stripe stops delivering
          (a 404 would be retried for ~3 days and count against the
          endpoint's failure rate).
        - ``payment_id`` present but row missing → ours, not visible yet.
          Raise 404 so Stripe redelivers and the event isn't dropped
          (Stripe never retries a 2xx).
        """
        payment = await self._find_payment_for_intent(intent)
        if payment:
            return payment

        if not (intent.metadata or {}).get("payment_id"):
            logger.info(
                f"Ignoring foreign PaymentIntent {intent.id} "
                "(no payment_id metadata)"
            )
            return None

        logger.warning(f"Payment not found for PaymentIntent {intent.id}")
        raise not_found_error(
            f"Payment not found for PaymentIntent {intent.id}"
        )

    async def _handle_payment_intent_succeeded(
        self, intent: stripe.PaymentIntent
    ) -> None:
        """Handle payment_intent.succeeded webhook event.

        Decides the winner of the post: with the post row locked, either this
        payment becomes the sale (and the reservation is cleared), or the post
        was already sold to someone else and this payment is flagged
        REFUND_REQUIRED for a manual Dashboard refund.
        """
        payment = await self._require_payment_for_intent(intent)

        if not payment:
            return

        if payment.status == PaymentStatus.SUCCESSFUL:
            return
        if payment.status == PaymentStatus.REFUNDED:
            return
        if payment.status == PaymentStatus.DISPUTED:
            return
        if payment.status == PaymentStatus.REFUND_REQUIRED:
            return

        await self._post_crud.get_by_id_for_update(self.db, id=payment.post_id)

        sold_to_other = await self._payment_crud.exists_successful_for_post(
            self.db, post_id=payment.post_id, exclude_payment_id=payment.id
        )
        if sold_to_other:
            await self._payment_crud.update_status(
                self.db, payment=payment, status=PaymentStatus.REFUND_REQUIRED
            )
            await self.db.commit()
            logger.error(
                f"Payment {payment.id} (intent {intent.id}) succeeded after "
                f"post {payment.post_id} was already sold; flagged "
                f"REFUND_REQUIRED — issue a manual refund from the Stripe "
                f"Dashboard"
            )
            return

        await self._payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.SUCCESSFUL,
        )

        # Founding-seller promo: consume one fee-free sale credit. Runs only
        # on the transition to SUCCESSFUL (redeliveries early-return above),
        # in the same transaction as the status flip.
        if payment.platform_fee_waived:
            await self._seller_crud.decrement_fee_free_sales(
                self.db, user_id=payment.seller_id
            )

        await self._post_crud.clear_reservation(self.db, post_id=payment.post_id)

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as successful via webhook")

        await self._cancel_other_pending_intents(
            post_id=payment.post_id, winner_payment_id=payment.id
        )

    async def _cancel_other_pending_intents(
        self, *, post_id: int, winner_payment_id: int
    ) -> None:
        """
        Best-effort cancel of other live intents for a just-sold post.

        Kills any other buyer's open QR immediately instead of letting it sit
        payable until it expires. Runs after the sale has committed; failures
        are only logged — an uncancellable intent that later gets paid is
        caught by the refund safety net, and a cancelled one settles via its
        own payment_intent.canceled webhook.
        """
        others = await self._payment_crud.get_pending_with_intent_by_post(
            self.db, post_id=post_id, exclude_payment_id=winner_payment_id
        )
        intent_ids = [p.stripe_payment_intent_id for p in others]
        # Close the read transaction before the network calls.
        await self.db.commit()

        for intent_id in intent_ids:
            if not intent_id:
                continue
            try:
                await self.stripe_service.cancel_payment_intent(intent_id)
            except stripe.StripeError as e:
                logger.warning(
                    f"Best-effort cancel of intent {intent_id} for sold post "
                    f"{post_id} failed: {e}"
                )

    async def _handle_payment_intent_failed(
        self, intent: stripe.PaymentIntent
    ) -> None:
        """Handle payment_intent.payment_failed / payment_intent.canceled events."""
        payment = await self._require_payment_for_intent(intent)
        if not payment:
            return

        # Don't downgrade from a terminal state. If Stripe eventually captures
        # after an earlier failed attempt, we don't want a late retry event to
        # mark a successful payment as failed. EXPIRED is terminal here too:
        # we cancelled the intent ourselves (buyer cancel or checkout
        # takeover) and already released or re-assigned the reservation, so
        # the resulting payment_intent.canceled event must not touch it.
        if payment.status in (
            PaymentStatus.SUCCESSFUL,
            PaymentStatus.REFUNDED,
            PaymentStatus.DISPUTED,
            PaymentStatus.EXPIRED,
            # Money was received and is awaiting a manual refund; a late
            # failed/canceled event must not relabel it as a clean failure.
            PaymentStatus.REFUND_REQUIRED,
        ):
            return
        if payment.status == PaymentStatus.FAILED:
            return  # idempotent

        last_error = intent.last_payment_error
        await self._payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.FAILED,
            failure_code=getattr(last_error, "code", None),
            failure_message=getattr(last_error, "message", None),
        )

        # Free the post for other buyers if this payment still holds it.
        # Lock order: payment row (already held) before post row.
        await self._post_crud.release_reservation(
            self.db, post_id=payment.post_id, payment_id=payment.id
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as failed via webhook")

    async def _handle_charge_refunded(self, charge: stripe.Charge) -> None:
        """Handle charge.refunded webhook event."""
        intent_id = charge.payment_intent
        payment: Payment | None = None
        if intent_id:
            payment = await self._payment_crud.get_by_payment_intent_id_for_update(
                self.db, payment_intent_id=intent_id
            )
        if not payment:
            logger.warning(
                f"Payment not found for refunded charge on intent {intent_id}"
            )
            return

        if payment.status == PaymentStatus.REFUNDED:
            return  # idempotent

        await self._payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.REFUNDED,
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as refunded via webhook")

    async def _find_payment_for_dispute(
        self, dispute: stripe.Dispute
    ) -> Payment | None:
        """Resolve the Payment a dispute refers to, via its PaymentIntent id."""
        intent_id = dispute.payment_intent
        if not intent_id:
            logger.warning(
                f"Dispute {dispute.id} has no payment_intent; cannot resolve payment"
            )
            return None
        return await self._payment_crud.get_by_payment_intent_id_for_update(
            self.db, payment_intent_id=intent_id
        )

    async def _handle_charge_dispute_created(
        self, dispute: stripe.Dispute
    ) -> None:
        """Handle charge.dispute.created: a chargeback was opened."""
        payment = await self._find_payment_for_dispute(dispute)
        if not payment:
            logger.warning(f"Payment not found for dispute {dispute.id}")
            return

        if payment.status == PaymentStatus.DISPUTED:
            return  # idempotent
        if payment.status == PaymentStatus.REFUNDED:
            return  # terminal; don't walk back
        if payment.status != PaymentStatus.SUCCESSFUL:
            logger.warning(
                f"Dispute on payment {payment.id} in unexpected status "
                f"{payment.status}"
            )
            return

        await self._payment_crud.update_status(
            self.db, payment=payment, status=PaymentStatus.DISPUTED
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as disputed via webhook")

    async def _handle_charge_dispute_closed(
        self, dispute: stripe.Dispute
    ) -> None:
        """Handle charge.dispute.closed: resolve the dispute as won or lost."""
        payment = await self._find_payment_for_dispute(dispute)
        if not payment:
            logger.warning(f"Payment not found for closed dispute {dispute.id}")
            return

        dispute_status = dispute.status

        if dispute_status == "lost":
            # A lost dispute reverses funds with no charge.refunded event.
            if payment.status == PaymentStatus.REFUNDED:
                return  # idempotent
            await self._payment_crud.update_status(
                self.db, payment=payment, status=PaymentStatus.REFUNDED
            )
            await self.db.commit()
            logger.info(
                f"Payment {payment.id} refunded via lost dispute {dispute.id}"
            )
            return

        if dispute_status == "won":
            # Only revert a payment we moved to DISPUTED; never resurrect one
            # that was refunded separately. Preserve paid_at/fulfillment_status.
            if payment.status == PaymentStatus.DISPUTED:
                await self._payment_crud.restore_to_successful(self.db, payment=payment)
                await self.db.commit()
                logger.info(
                    f"Payment {payment.id} restored to successful via won "
                    f"dispute {dispute.id}"
                )
            return

        # warning_closed and other non-terminal closures: no state change.
        logger.info(
            f"Dispute {dispute.id} closed with status {dispute_status}; no change"
        )

    async def _handle_account_updated(self, account: stripe.Account) -> None:
        """Handle account.updated webhook event for seller Connect accounts."""
        account_id = account.id

        if not account_id:
            return

        seller_profile = await self._seller_crud.get_by_stripe_account_id_for_update(
            self.db, stripe_account_id=account_id
        )

        if not seller_profile:
            logger.warning(f"Seller profile not found for account {account_id}")
            return

        charges_enabled = bool(account.charges_enabled)
        payouts_enabled = bool(account.payouts_enabled)
        details_submitted = bool(account.details_submitted)

        await self._seller_crud.update_account_status(
            self.db,
            seller_profile=seller_profile,
            charges_enabled=charges_enabled,
            payouts_enabled=payouts_enabled,
            details_submitted=details_submitted,
        )

        fully_onboarded = charges_enabled and payouts_enabled and details_submitted

        requirements = getattr(account, "requirements", None)
        disabled_reason = getattr(requirements, "disabled_reason", None)
        is_rejected = bool(disabled_reason and disabled_reason.startswith("rejected"))

        if is_rejected:
            if seller_profile.verification_status != SellerVerificationStatus.REJECTED:
                await self._seller_crud.update_verification_status(
                    self.db,
                    seller_profile=seller_profile,
                    status=SellerVerificationStatus.REJECTED,
                    rejection_reason=disabled_reason,
                )
                logger.info(
                    f"Seller {seller_profile.user_id} rejected via account.updated webhook"
                )
        elif (
            fully_onboarded
            and seller_profile.verification_status != SellerVerificationStatus.VERIFIED
        ):
            await self._seller_crud.update_verification_status(
                self.db,
                seller_profile=seller_profile,
                status=SellerVerificationStatus.VERIFIED,
            )
            logger.info(
                f"Seller {seller_profile.user_id} verified via account.updated webhook"
            )
        elif (
            not fully_onboarded
            and seller_profile.verification_status == SellerVerificationStatus.VERIFIED
        ):
            await self._seller_crud.update_verification_status(
                self.db,
                seller_profile=seller_profile,
                status=SellerVerificationStatus.PENDING,
            )
            logger.info(
                f"Seller {seller_profile.user_id} reverted to pending via account.updated webhook"
            )

        await self.db.commit()

    async def _handle_account_deauthorized(self, account_id: str | None) -> None:
        """Handle account.application.deauthorized: seller disconnected the platform.

        The connected account can no longer accept charges or receive payouts,
        so disable both flags and mark the profile REJECTED. All seller gating
        is on verification_status.
        """
        if not account_id:
            return

        seller_profile = await self._seller_crud.get_by_stripe_account_id_for_update(
            self.db, stripe_account_id=account_id
        )
        if not seller_profile:
            logger.warning(
                f"Seller profile not found for deauthorized account {account_id}"
            )
            return

        # Idempotent: nothing to do if already fully disabled and not verified.
        if (
            not seller_profile.charges_enabled
            and not seller_profile.payouts_enabled
            and seller_profile.verification_status
            != SellerVerificationStatus.VERIFIED
        ):
            return

        await self._seller_crud.update_account_status(
            self.db,
            seller_profile=seller_profile,
            charges_enabled=False,
            payouts_enabled=False,
            details_submitted=seller_profile.details_submitted,
        )
        await self._seller_crud.update_verification_status(
            self.db,
            seller_profile=seller_profile,
            status=SellerVerificationStatus.REJECTED,
            rejection_reason="account_deauthorized",
        )

        await self.db.commit()
        logger.info(
            f"Seller {seller_profile.user_id} downgraded via account deauthorization"
        )


def _get_stripe_webhook_service(
    stripe_service: AnnotatedStripeService,
    post_crud: AnnotatedPostCRUD,
    payment_crud: AnnotatedPaymentCRUD,
    seller_crud: AnnotatedSellerCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> StripeWebhookService:
    """Factory function to create StripeWebhookService instance."""
    return StripeWebhookService(
        db,
        stripe_service,
        post_crud,
        payment_crud,
        seller_crud,
    )


AnnotatedStripeWebhookService = Annotated[
    StripeWebhookService, Depends(_get_stripe_webhook_service)
]
