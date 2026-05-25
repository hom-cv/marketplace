"""Stripe webhook dispatch and event handlers.

Signature verification happens at the endpoint (`construct_event`); this
service receives already-trusted Stripe events and applies their effects
to the database. All handlers are idempotent — Stripe may redeliver the
same event and we must converge to the same state regardless of order or
duplication.
"""

import logging
from typing import Annotated

import stripe
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.stripe import WEBHOOK_EVENT_HANDLER_MAP
from app.crud.payment import payment_crud
from app.crud.seller import seller_crud
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.payment import Payment, PaymentStatus
from app.models.seller import SellerVerificationStatus

logger = logging.getLogger(__name__)


class StripeWebhookService:
    """Service for handling Stripe webhook events."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def process_webhook(self, event: stripe.Event) -> None:
        """
        Process a Stripe webhook event (signature already verified upstream).

        All handlers are idempotent: Stripe may redeliver the same event
        multiple times and we must converge to the same state regardless of
        order or duplication.

        Args:
            event: Verified Stripe Event object.
        """
        event_type = event.get("type")
        logger.info(f"Processing Stripe webhook: {event_type}")

        if not event_type:
            return

        data_object = event["data"]["object"]

        handler_name = WEBHOOK_EVENT_HANDLER_MAP.get(event_type)
        if handler_name:
            handler = getattr(self, f"_handle_{handler_name}")
            await handler(data_object)
        else:
            logger.debug(f"Unhandled Stripe event: {event_type}")

    async def _find_payment_for_intent(self, intent: dict) -> Payment | None:
        """
        Look up a Payment row for a PaymentIntent webhook payload.

        Primary lookup is by ``stripe_payment_intent_id``. If that misses
        (possible if the webhook arrives before the DB commit that stores the
        intent ID landed — rare but observable under failure) we fall back to
        ``metadata.payment_id``, which is always set at PaymentIntent creation.
        """
        intent_id = intent.get("id")
        payment: Payment | None = None
        if intent_id:
            payment = await payment_crud.get_by_payment_intent_id(
                self.db, payment_intent_id=intent_id
            )
        if payment:
            return payment

        metadata = intent.get("metadata") or {}
        payment_id_raw = metadata.get("payment_id")
        if payment_id_raw is None:
            return None
        try:
            payment_id = int(payment_id_raw)
        except (TypeError, ValueError):
            return None

        payment = await payment_crud.get_by_id(self.db, id=payment_id)
        if payment and intent_id and not payment.stripe_payment_intent_id:
            payment.stripe_payment_intent_id = intent_id

            await self.db.flush()

        return payment

    async def _handle_payment_intent_succeeded(self, intent: dict) -> None:
        """Handle payment_intent.succeeded webhook event."""
        payment = await self._find_payment_for_intent(intent)
        if not payment:
            logger.warning(
                f"Payment not found for PaymentIntent {intent.get('id')}"
            )
            return

        if payment.status == PaymentStatus.SUCCESSFUL:
            # Idempotent: already processed.
            return
        if payment.status == PaymentStatus.REFUNDED:
            # Don't walk backwards from a terminal state.
            return

        await payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.SUCCESSFUL,
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as successful via webhook")

    async def _handle_payment_intent_failed(self, intent: dict) -> None:
        """Handle payment_intent.payment_failed / payment_intent.canceled events."""
        payment = await self._find_payment_for_intent(intent)
        if not payment:
            logger.warning(
                f"Payment not found for PaymentIntent {intent.get('id')}"
            )
            return

        # Don't downgrade from a terminal state. If Stripe eventually captures
        # after an earlier failed attempt, we don't want a late retry event to
        # mark a successful payment as failed.
        if payment.status in (
            PaymentStatus.SUCCESSFUL,
            PaymentStatus.REFUNDED,
        ):
            return
        if payment.status == PaymentStatus.FAILED:
            return  # idempotent

        last_error = intent.get("last_payment_error") or {}
        await payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.FAILED,
            failure_code=last_error.get("code"),
            failure_message=last_error.get("message"),
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as failed via webhook")

    async def _handle_charge_refunded(self, charge: dict) -> None:
        """Handle charge.refunded webhook event."""
        intent_id = charge.get("payment_intent")
        payment: Payment | None = None
        if intent_id:
            payment = await payment_crud.get_by_payment_intent_id(
                self.db, payment_intent_id=intent_id
            )
        if not payment:
            logger.warning(
                f"Payment not found for refunded charge on intent {intent_id}"
            )
            return

        if payment.status == PaymentStatus.REFUNDED:
            return  # idempotent

        await payment_crud.update_status(
            self.db,
            payment=payment,
            status=PaymentStatus.REFUNDED,
        )

        await self.db.commit()
        logger.info(f"Payment {payment.id} marked as refunded via webhook")

    async def _handle_account_updated(self, account: dict) -> None:
        """Handle account.updated webhook event for seller Connect accounts."""
        account_id = account.get("id")

        if not account_id:
            return

        seller_profile = await seller_crud.get_by_stripe_account_id(
            self.db, stripe_account_id=account_id
        )

        if not seller_profile:
            logger.warning(f"Seller profile not found for account {account_id}")
            return

        charges_enabled = bool(account.get("charges_enabled"))
        payouts_enabled = bool(account.get("payouts_enabled"))
        details_submitted = bool(account.get("details_submitted"))

        await seller_crud.update_account_status(
            self.db,
            seller_profile=seller_profile,
            charges_enabled=charges_enabled,
            payouts_enabled=payouts_enabled,
            details_submitted=details_submitted,
        )

        fully_onboarded = charges_enabled and payouts_enabled and details_submitted

        if (
            fully_onboarded
            and seller_profile.verification_status != SellerVerificationStatus.VERIFIED
        ):
            user = await user_crud.get_by_id_with_relations(
                self.db, id=seller_profile.user_id
            )
            if user:
                await seller_crud.update_verification_status(
                    self.db,
                    seller_profile=seller_profile,
                    status=SellerVerificationStatus.VERIFIED,
                )
                await seller_crud.assign_seller_role(self.db, user=user)
                logger.info(
                    f"Seller {seller_profile.user_id} verified via account.updated webhook"
                )
        elif (
            seller_profile.verification_status == SellerVerificationStatus.PENDING
        ):
            disabled_reason = (account.get("requirements") or {}).get(
                "disabled_reason"
            )

            # Only treat "rejected.*" reasons as terminal. Other values like
            # "requirements.past_due" or "under_review" are transient — the
            # seller can still complete onboarding or wait for Stripe review.
            if disabled_reason and disabled_reason.startswith("rejected"):
                await seller_crud.update_verification_status(
                    self.db,
                    seller_profile=seller_profile,
                    status=SellerVerificationStatus.REJECTED,
                    rejection_reason=disabled_reason,
                )
                logger.info(
                    f"Seller {seller_profile.user_id} rejected via account.updated webhook"
                )

        await self.db.commit()


def _get_stripe_webhook_service(
    db: AsyncSession = Depends(get_async_db),
) -> StripeWebhookService:
    """Factory function to create StripeWebhookService instance."""
    return StripeWebhookService(db)


AnnotatedStripeWebhookService = Annotated[
    StripeWebhookService, Depends(_get_stripe_webhook_service)
]
