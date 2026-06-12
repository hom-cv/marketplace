"""Payment service for handling payment processing."""

import logging
from typing import Annotated

import stripe
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.stripe import CURRENCY_SUBUNIT_MULTIPLIER, DEFAULT_CURRENCY
from app.core.exceptions import (
    bad_request_error,
    conflict_error,
    forbidden_error,
    not_found_error,
)
from app.core.settings import AnnotatedSettings, Settings
from app.crud.payment import payment_crud
from app.crud.post import post_crud
from app.crud.seller import seller_crud
from app.db.utils import get_async_db
from app.models.payment import PaymentMethod, PaymentStatus
from app.models.seller import SellerVerificationStatus
from app.models.user import User
from app.schemas.payment import (
    CreateCardPaymentRequest,
    CreatePromptPayPaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
    PriceBreakdown,
    ShippingAddress,
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
            NotFoundError: If post not found, soft-deleted, or banned.
            ForbiddenError: If trying to buy own post.
            ConflictError: If the post has already been sold.
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
        shipping: ShippingAddress,
        payment_method: PaymentMethod,
        payment_method_types: list[str],
    ) -> PaymentResponse:
        """Shared logic to validate, create a Payment row, and create a PaymentIntent."""
        result = await post_crud.get_by_id_with_status(self.db, id=post_id)

        if result is None:
            raise not_found_error("Post not found")

        post, is_post_banned, is_user_banned, is_sold = result

        if is_post_banned or is_user_banned:
            raise not_found_error("Post not found")

        if post.user_id == buyer.id:
            raise forbidden_error("You cannot purchase your own listing")

        if is_sold:
            raise conflict_error("This item has already been sold")

        seller_profile = await seller_crud.get_by_user_id(self.db, user_id=post.user_id)
        if (
            not seller_profile
            or seller_profile.verification_status != SellerVerificationStatus.VERIFIED
            or not seller_profile.stripe_account_id
        ):
            raise bad_request_error("Seller is not verified")

        if not seller_profile.charges_enabled:
            raise bad_request_error("Seller is not currently able to accept payments")

        if not seller_profile.payouts_enabled:
            raise bad_request_error(
                "Seller cannot currently receive payouts; their account needs attention"
            )

        seller_stripe_account_id: str = seller_profile.stripe_account_id

        # Calculate total with all fees using pricing service
        method_type = (
            PaymentMethodType.PROMPTPAY
            if payment_method == PaymentMethod.PROMPTPAY
            else PaymentMethodType.CARD
        )
        # Founding-seller promo: waive the platform fee while credits remain.
        # The credit is consumed when the payment succeeds (webhook).
        #
        # Known accepted limitation: with 1 credit left, two concurrent
        # checkouts for the same seller can both read remaining > 0 here and
        # both get waived (the decrement happens on webhook success;
        # GREATEST floors the counter at 0). Worst case is one extra waived
        # platform fee, in the seller's favor — deemed not worth a locking
        # scheme at MVP scale. Revisit if promo credits or traffic grow.
        waive_platform_fee = seller_profile.fee_free_sales_remaining > 0
        price_breakdown = self.pricing_service.calculate_order_total(
            post.price,
            post.shipping_cost,
            method_type,
            waive_platform_fee=waive_platform_fee,
        )

        # Convert to satang
        amount = int(price_breakdown.total * CURRENCY_SUBUNIT_MULTIPLIER)
        fees = _breakdown_to_satang(price_breakdown)
        currency = DEFAULT_CURRENCY

        if fees["seller_payout"] < self._settings.MIN_PAYOUT_AMOUNT_SATANG:
            raise bad_request_error(
                "Order total is too low to process a seller payout"
            )

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
            platform_fee_waived=waive_platform_fee,
            shipping_name=shipping.name,
            shipping_phone=shipping.phone,
            shipping_address=shipping.address,
            shipping_district=shipping.district,
            shipping_province=shipping.province,
            shipping_postal_code=shipping.postal_code,
        )

        application_fee_amount = fees["platform_fee"] + fees["processing_fee"]

        try:
            intent = await self.stripe_service.create_payment_intent(
                amount=amount,
                currency=currency,
                payment_method_types=payment_method_types,
                destination_account_id=seller_stripe_account_id,
                application_fee_amount=application_fee_amount,
                metadata={
                    "payment_id": str(payment.id),
                    "post_id": str(post.id),
                    "buyer_id": str(buyer.id),
                    "seller_id": str(post.user_id),
                },
                description=f"Purchase: {post.title}",
                idempotency_key=f"pi-{payment.id}",
            )
        except stripe.StripeError as e:
            logger.error(f"Stripe error creating PaymentIntent: {e}")
            raise bad_request_error(f"Payment failed: {str(e)}")

        payment.stripe_payment_intent_id = intent.id

        await self.db.commit()

        await self.db.refresh(payment)

        if not intent.client_secret:
            raise bad_request_error("Payment intent missing client_secret")

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
