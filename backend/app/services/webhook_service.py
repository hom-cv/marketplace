"""Webhook service for handling Omise webhook events."""

import logging
from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.omise import ChargeStatus, EventKey
from app.crud.payment import payment_crud
from app.crud.seller import seller_crud
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.payment import PaymentStatus
from app.models.seller import SellerVerificationStatus

logger = logging.getLogger(__name__)


class WebhookService:
    """Service for processing Omise webhook events."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def process_webhook(self, event_key: str, event_data: dict) -> None:
        """
        Process an Omise webhook event.

        Args:
            event_key: The event key (e.g., 'charge.complete').
            event_data: The event data.
        """
        logger.info(f"Processing webhook: {event_key}")

        if event_key == EventKey.CHARGE_COMPLETE:
            await self._handle_charge_complete(event_data)
        elif event_key == EventKey.TRANSFER_PAY:
            await self._handle_transfer_pay(event_data)
        elif event_key == EventKey.RECIPIENT_VERIFY:
            await self._handle_recipient_verify(event_data)

    async def _handle_charge_complete(self, data: dict) -> None:
        """Handle charge.complete webhook event (idempotent)."""
        charge_id = data.get("id")
        if not charge_id:
            return

        payment = await payment_crud.get_by_charge_id(self.db, charge_id=charge_id)
        if not payment:
            logger.warning(f"Payment not found for charge {charge_id}")
            return

        # Idempotency: skip if payment already in a terminal state
        if payment.status in (
            PaymentStatus.SUCCESSFUL,
            PaymentStatus.FAILED,
            PaymentStatus.EXPIRED,
            PaymentStatus.REFUNDED,
        ):
            logger.info(
                f"Payment {payment.id} already in terminal state "
                f"{payment.status.value}, skipping webhook"
            )
            return

        status = data.get("status")
        if status == ChargeStatus.SUCCESSFUL:
            await payment_crud.update_status(
                self.db,
                payment=payment,
                status=PaymentStatus.SUCCESSFUL,
            )
            logger.info(f"Payment {payment.id} marked as successful")
        elif status == ChargeStatus.FAILED:
            await payment_crud.update_status(
                self.db,
                payment=payment,
                status=PaymentStatus.FAILED,
                failure_code=data.get("failure_code"),
                failure_message=data.get("failure_message"),
            )
            logger.info(f"Payment {payment.id} marked as failed")
        elif status == ChargeStatus.EXPIRED:
            await payment_crud.update_status(
                self.db,
                payment=payment,
                status=PaymentStatus.EXPIRED,
            )
            logger.info(f"Payment {payment.id} marked as expired")

    async def _handle_transfer_pay(self, data: dict) -> None:
        """Handle transfer.pay webhook event."""
        transfer_id = data.get("id")
        if not transfer_id:
            return

        payment = await payment_crud.get_by_transfer_id(
            self.db, transfer_id=transfer_id
        )
        if not payment:
            logger.warning(f"Payment not found for transfer {transfer_id}")
            return

        failure_code = data.get("failure_code")
        if failure_code:
            # Idempotency: if transferred_at is already None, we have already
            # processed this failure webhook.
            if payment.transferred_at is None:
                logger.info(
                    f"Transfer failure for {transfer_id} already recorded "
                    f"for payment {payment.id}"
                )
                return

            await payment_crud.record_transfer_failure(
                self.db, payment=payment
            )

            await self.db.commit()

            logger.critical(
                f"Transfer {transfer_id} FAILED for payment {payment.id}: "
                f"{failure_code}. transferred_at cleared, "
                f"omise_transfer_id preserved for reconciliation."
            )
        else:
            if not payment.transferred_at:
                # Self-correct: restore transferred_at if it was cleared by a
                # prior failure webhook or was never set.
                paid_at = data.get("paid_at")
                if paid_at and isinstance(paid_at, str):
                    payment.transferred_at = datetime.fromisoformat(
                        paid_at.replace("Z", "+00:00")
                    )
                else:
                    payment.transferred_at = datetime.now(timezone.utc)
                await self.db.flush()
                await self.db.commit()
                logger.info(
                    f"Transfer {transfer_id} completed for payment "
                    f"{payment.id}, transferred_at restored"
                )
            else:
                logger.info(
                    f"Transfer {transfer_id} already marked complete "
                    f"for payment {payment.id}, skipping"
                )

    async def _handle_recipient_verify(self, data: dict) -> None:
        """Handle recipient.verify webhook event."""
        recipient_id = data.get("id")
        if not recipient_id:
            return

        seller_profile = await seller_crud.get_by_recipient_id(
            self.db, recipient_id=recipient_id
        )
        if not seller_profile:
            logger.warning(f"Seller profile not found for recipient {recipient_id}")
            return

        verified = data.get("verified", False)
        if verified:
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
                logger.info(f"Seller {seller_profile.user_id} verified via webhook")
        elif data.get("failure_code"):
            await seller_crud.update_verification_status(
                self.db,
                seller_profile=seller_profile,
                status=SellerVerificationStatus.REJECTED,
                rejection_reason=data.get("failure_code"),
            )
            logger.info(f"Seller {seller_profile.user_id} rejected via webhook")


def _get_webhook_service(
    db: AsyncSession = Depends(get_async_db),
) -> WebhookService:
    """Factory function to create WebhookService instance."""
    return WebhookService(db)


AnnotatedWebhookService = Annotated[WebhookService, Depends(_get_webhook_service)]
