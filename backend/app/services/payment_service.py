"""Payment service for handling payment processing."""

import logging
from datetime import datetime, timezone
from typing import Annotated

import stripe
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.stripe import CURRENCY_SUBUNIT_MULTIPLIER, DEFAULT_CURRENCY
from app.core.exceptions import bad_request_error, forbidden_error, not_found_error
from app.core.settings import AnnotatedSettings, Settings
from app.crud.payment import payment_crud
from app.crud.post import post_crud
from app.crud.seller import seller_crud
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.payment import FulfillmentStatus, Payment, PaymentMethod, PaymentStatus
from app.models.seller import SellerVerificationStatus
from app.models.user import User
from app.schemas.payment import (
    CreateCardPaymentRequest,
    CreatePromptPayPaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
    PayoutResponse,
    PriceBreakdown,
)
from app.services.pricing_service import (
    AnnotatedPricingService,
    PaymentMethodType,
    PricingService,
)
from app.services.stripe_service import AnnotatedStripeService, StripeService

logger = logging.getLogger(__name__)


def _breakdown_to_satang(breakdown: PriceBreakdown) -> dict[str, int]:
    """Convert a PriceBreakdown (THB Decimals) to satang ints for DB storage."""
    m = CURRENCY_SUBUNIT_MULTIPLIER
    return {
        "item_price": int(breakdown.item_price * m),
        "shipping_cost": int(breakdown.shipping_cost * m),
        "platform_fee": int(breakdown.platform_fee * m),
        "processing_fee": int(breakdown.processing_fee * m),
        "total_vat": int(breakdown.total_vat * m),
        "seller_payout": int(breakdown.seller_payout * m),
    }


class PaymentService:
    """Service for payment processing operations."""

    def __init__(
        self,
        db: AsyncSession,
        stripe_service: StripeService,
        settings: Settings,
        pricing_service: PricingService,
    ) -> None:
        """Initialize payment service with database session."""
        self.db = db
        self.stripe_service = stripe_service
        self._settings = settings
        self.pricing_service = pricing_service

    async def create_card_payment(
        self, buyer: User, payment_request: CreateCardPaymentRequest
    ) -> PaymentResponse:
        """
        Create a card PaymentIntent for a post.

        Args:
            buyer (User): The buyer.
            payment_request (CreateCardPaymentRequest): Payment details.

        Returns:
            PaymentResponse: The payment response with the Stripe client secret.

        Raises:
            NotFoundError: If post not found.
            ForbiddenError: If trying to buy own post.
            BadRequestError: If seller not verified or payment fails.
        """
        return await self._create_payment_intent(
            buyer=buyer,
            post_id=payment_request.post_id,
            shipping=payment_request.shipping,
            payment_method=PaymentMethod.CARD,
            payment_method_types=["card"],
        )

    async def create_promptpay_payment(
        self, buyer: User, payment_request: CreatePromptPayPaymentRequest
    ) -> PaymentResponse:
        """
        Create a PromptPay PaymentIntent for a post.

        Args:
            buyer (User): The buyer.
            payment_request (CreatePromptPayPaymentRequest): Payment details.

        Returns:
            PaymentResponse: The payment response with the Stripe client secret.
        """
        return await self._create_payment_intent(
            buyer=buyer,
            post_id=payment_request.post_id,
            shipping=payment_request.shipping,
            payment_method=PaymentMethod.PROMPTPAY,
            payment_method_types=["promptpay"],
        )

    async def _create_payment_intent(
        self,
        *,
        buyer: User,
        post_id: int,
        shipping,
        payment_method: PaymentMethod,
        payment_method_types: list[str],
    ) -> PaymentResponse:
        """Shared logic to validate, create a Payment row, and create a PaymentIntent."""
        # Get the post
        post = await post_crud.get_by_id(self.db, id=post_id)
        if not post:
            raise not_found_error("Post not found")

        # Cannot buy own post
        if post.user_id == buyer.id:
            raise forbidden_error("You cannot purchase your own listing")

        # Check if seller is verified
        seller_profile = await seller_crud.get_by_user_id(self.db, user_id=post.user_id)
        if (
            not seller_profile
            or seller_profile.verification_status != SellerVerificationStatus.VERIFIED
        ):
            raise bad_request_error("Seller is not verified")

        # Calculate total with all fees using pricing service
        method_type = (
            PaymentMethodType.PROMPTPAY
            if payment_method == PaymentMethod.PROMPTPAY
            else PaymentMethodType.CARD
        )
        price_breakdown = self.pricing_service.calculate_order_total(
            post.price, post.shipping_cost, method_type
        )

        # Convert to satang
        amount = int(price_breakdown.total * CURRENCY_SUBUNIT_MULTIPLIER)
        fees = _breakdown_to_satang(price_breakdown)
        currency = DEFAULT_CURRENCY

        # Create payment record first to get the ID
        payment = await payment_crud.create_payment(
            self.db,
            buyer_id=buyer.id,
            seller_id=post.user_id,
            post_id=post.id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            stripe_payment_intent_id=None,  # Will update after intent creation
            description=f"Purchase: {post.title}",
            **fees,
            shipping_name=shipping.name,
            shipping_phone=shipping.phone,
            shipping_address=shipping.address,
            shipping_district=shipping.district,
            shipping_province=shipping.province,
            shipping_postal_code=shipping.postal_code,
        )

        try:
            intent = self.stripe_service.create_payment_intent(
                amount=amount,
                currency=currency,
                payment_method_types=payment_method_types,
                metadata={
                    "payment_id": str(payment.id),
                    "post_id": str(post.id),
                    "buyer_id": str(buyer.id),
                    "seller_id": str(post.user_id),
                },
                description=f"Purchase: {post.title}",
                transfer_group=f"payment_{payment.id}",
                idempotency_key=f"pi-{payment.id}",
            )
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating PaymentIntent: {e}")
            raise bad_request_error(f"Payment failed: {str(e)}")

        payment.stripe_payment_intent_id = intent.id
        await self.db.commit()
        await self.db.refresh(payment)

        return PaymentResponse(
            payment_id=payment.id,
            status=payment.status.value.lower(),
            client_secret=intent.client_secret,
            payment_intent_id=intent.id,
        )

    async def get_payment_status(
        self, payment_id: int, user: User
    ) -> PaymentStatusResponse:
        """
        Get the status of a payment.

        Args:
            payment_id (int): The payment ID.
            user (User): The user requesting the status.

        Returns:
            PaymentStatusResponse: The payment status.

        Raises:
            NotFoundError: If payment not found.
            ForbiddenError: If user is not buyer or seller.
        """
        payment = await payment_crud.get_by_id(self.db, id=payment_id)
        if not payment:
            raise not_found_error("Payment not found")

        # Only buyer or seller can view payment status
        if payment.buyer_id != user.id and payment.seller_id != user.id:
            raise forbidden_error("You are not authorized to view this payment")

        return PaymentStatusResponse(
            payment_id=payment.id,
            status=payment.status.value.lower(),
            amount=payment.amount,
            currency=payment.currency,
            payment_method=payment.payment_method.value.lower(),
            paid_at=payment.paid_at,
            failure_code=payment.failure_code,
            failure_message=payment.failure_message,
        )

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

        data_object = event["data"]["object"]

        if event_type == "payment_intent.succeeded":
            await self._handle_payment_intent_succeeded(data_object)
        elif event_type in (
            "payment_intent.payment_failed",
            "payment_intent.canceled",
        ):
            await self._handle_payment_intent_failed(data_object)
        elif event_type == "charge.refunded":
            await self._handle_charge_refunded(data_object)
        elif event_type == "account.updated":
            await self._handle_account_updated(data_object)
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
            # Heal the missing link so future webhooks use the primary lookup.
            payment.stripe_payment_intent_id = intent_id
            await self.db.commit()
            await self.db.refresh(payment)
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

    async def get_pending_payouts(
        self, skip: int = 0, limit: int = 50
    ) -> tuple[list[Payment], int]:
        """Get payments eligible for payout (successful, delivered, not transferred)."""
        return await payment_crud.get_pending_payouts(
            self.db, skip=skip, limit=limit
        )

    async def get_completed_payouts(
        self, skip: int = 0, limit: int = 50
    ) -> tuple[list[Payment], int]:
        """Get payments that have been paid out."""
        return await payment_crud.get_completed_payouts(
            self.db, skip=skip, limit=limit
        )

    async def create_payout(self, payment_id: int) -> PayoutResponse:
        """
        Initiate a payout (Stripe transfer) for a delivered payment.

        Args:
            payment_id: The payment ID to pay out.

        Returns:
            PayoutResponse with transfer details.

        Raises:
            NotFoundError: If payment not found.
            BadRequestError: If payment is not eligible for payout.
        """
        # Lock the row to prevent concurrent duplicate payouts
        payment = await payment_crud.get_by_id_for_update(self.db, id=payment_id)
        if not payment:
            raise not_found_error("Payment not found")

        if payment.status != PaymentStatus.SUCCESSFUL:
            raise bad_request_error("Payment is not successful")

        if payment.stripe_transfer_id:
            raise bad_request_error("Payment has already been paid out")

        if payment.fulfillment_status != FulfillmentStatus.DELIVERED:
            raise bad_request_error("Item has not been delivered yet")

        if not payment.seller_payout or payment.seller_payout <= 0:
            raise bad_request_error("No payout amount calculated for this payment")

        min_amount = self._settings.MIN_PAYOUT_AMOUNT_SATANG
        if payment.seller_payout < min_amount:
            raise bad_request_error(
                f"Payout amount ({payment.seller_payout} satang) is below "
                f"the minimum transfer amount ({min_amount} satang)"
            )

        # Get seller's Stripe connected account and verify it can receive funds
        seller_profile = await seller_crud.get_by_user_id(
            self.db, user_id=payment.seller_id
        )
        if not seller_profile or not seller_profile.stripe_account_id:
            raise bad_request_error("Seller does not have a verified payout account")
        if not seller_profile.payouts_enabled:
            raise bad_request_error("Seller's payout account is not enabled for payouts")

        try:
            transfer = self.stripe_service.create_transfer(
                amount=payment.seller_payout,
                destination_account_id=seller_profile.stripe_account_id,
                currency=payment.currency,
                metadata={
                    "payment_id": str(payment.id),
                    "seller_id": str(payment.seller_id),
                },
                transfer_group=f"payment_{payment.id}",
                idempotency_key=f"tr-payment-{payment.id}",
            )
        except stripe.StripeError as e:
            logger.error(f"Stripe error during payout for payment {payment_id}: {e}")
            raise bad_request_error(f"Failed to create payout: {str(e)}")

        try:
            await payment_crud.update_transfer(
                self.db, payment=payment, transfer_id=transfer.id
            )
            await self.db.commit()
        except Exception:
            await self.db.rollback()
            logger.critical(
                f"TRANSFER RECORDED BUT DB UPDATE FAILED. "
                f"payment_id={payment_id}, transfer_id={transfer.id}, "
                f"amount={payment.seller_payout} satang, "
                f"seller_id={payment.seller_id}. "
                f"Manual reconciliation required."
            )
            raise

        logger.info(
            f"Payout created for payment {payment_id}: "
            f"transfer {transfer.id}, amount {payment.seller_payout} satang"
        )

        return PayoutResponse(
            payment_id=payment_id,
            transfer_id=transfer.id,
            amount=payment.seller_payout,
            status="transferred",
        )

    async def add_tracking(
        self,
        payment_id: int,
        user: User,
        tracking_number: str,
        carrier: str,
    ) -> None:
        """
        Add tracking number to a payment (seller action).

        Args:
            payment_id: The payment ID.
            user: The user adding tracking (must be seller).
            tracking_number: The tracking number.
            carrier: The shipping carrier.

        Raises:
            NotFoundError: If payment not found.
            ForbiddenError: If user is not seller or payment not successful.
        """
        payment = await payment_crud.get_by_id(self.db, id=payment_id)
        if not payment:
            raise not_found_error("Payment not found")

        if payment.seller_id != user.id:
            raise forbidden_error("Only the seller can add tracking information")

        if payment.status != PaymentStatus.SUCCESSFUL:
            raise forbidden_error("Can only add tracking to successful payments")

        await payment_crud.add_tracking_number(
            self.db,
            payment=payment,
            tracking_number=tracking_number,
            carrier=carrier,
        )
        await self.db.commit()

    async def confirm_delivery(
        self,
        payment_id: int,
        user: User,
    ) -> None:
        """
        Confirm delivery of an item (buyer action).

        Args:
            payment_id: The payment ID.
            user: The user confirming delivery (must be buyer).

        Raises:
            NotFoundError: If payment not found.
            ForbiddenError: If user is not buyer or payment not successful.
        """
        payment = await payment_crud.get_by_id(self.db, id=payment_id)
        if not payment:
            raise not_found_error("Payment not found")

        if payment.buyer_id != user.id:
            raise forbidden_error("Only the buyer can confirm delivery")

        if payment.status != PaymentStatus.SUCCESSFUL:
            raise forbidden_error("Can only confirm delivery for successful payments")

        await payment_crud.confirm_delivery(self.db, payment=payment)
        await self.db.commit()


def _get_payment_service(
    stripe_service: AnnotatedStripeService,
    settings: AnnotatedSettings,
    pricing_service: AnnotatedPricingService,
    db: AsyncSession = Depends(get_async_db),
) -> PaymentService:
    """Factory function to create PaymentService instance."""
    return PaymentService(db, stripe_service, settings, pricing_service)


AnnotatedPaymentService = Annotated[PaymentService, Depends(_get_payment_service)]
