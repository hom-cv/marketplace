"""Payment service for handling payment processing."""

import logging
from datetime import datetime

import omise.errors
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, forbidden_error, not_found_error
from app.crud.payment import payment_crud
from app.crud.post import post_crud
from app.crud.seller import seller_crud
from app.crud.user import user_crud
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.models.seller import SellerVerificationStatus
from app.models.user import User
from app.schemas.payment import (
    CreateCardPaymentRequest,
    CreatePromptPayPaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
)
from app.services.omise_service import OmiseService
from app.services.pricing_service import calculate_order_total, PaymentMethodType
from app.core.settings import get_settings

logger = logging.getLogger(__name__)


class PaymentService:
    """Service for payment processing operations."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize payment service with database session."""
        self.db = db
        self.omise_service = OmiseService()

    async def create_card_payment(
        self, buyer: User, payment_request: CreateCardPaymentRequest
    ) -> PaymentResponse:
        """
        Create a card payment for a post.

        Args:
            buyer (User): The buyer.
            payment_request (CreateCardPaymentRequest): Payment details.

        Returns:
            PaymentResponse: The payment response with charge details.

        Raises:
            NotFoundError: If post not found.
            ForbiddenError: If trying to buy own post.
            BadRequestError: If seller not verified or payment fails.
        """
        # Get the post
        post = await post_crud.get_by_id(self.db, id=payment_request.post_id)
        if not post:
            raise not_found_error("Post not found")

        # Cannot buy own post
        if post.user_id == buyer.id:
            raise forbidden_error("You cannot purchase your own listing")

        # Check if seller is verified
        seller_profile = await seller_crud.get_by_user_id(
            self.db, user_id=post.user_id
        )
        if (
            not seller_profile
            or seller_profile.verification_status != SellerVerificationStatus.VERIFIED
        ):
            raise bad_request_error("Seller is not verified")

        # Calculate total with all fees using pricing service
        price_breakdown = calculate_order_total(post.price, post.shipping_cost, PaymentMethodType.CARD)
        
        # Convert total to satang (smallest unit for THB)
        amount = int(price_breakdown.total * 100)
        platform_fee_satang = int(price_breakdown.platform_fee * 100)
        currency = "THB"

        try:
            # Build return_uri with payment_id placeholder - we'll create payment first
            # Create payment record first to get the ID
            payment = await payment_crud.create_payment(
                self.db,
                buyer_id=buyer.id,
                seller_id=post.user_id,
                post_id=post.id,
                amount=amount,
                currency=currency,
                payment_method=PaymentMethod.CARD,
                omise_charge_id=None,  # Will update after charge creation
                authorize_uri=None,
                return_uri=payment_request.return_uri,
                description=f"Purchase: {post.title}",
                # Fee breakdown for accounting (all in satang)
                item_price=int(price_breakdown.item_price * 100),
                shipping_cost=int(price_breakdown.shipping_cost * 100),
                vat_amount=int(price_breakdown.vat_amount * 100),
                processing_fee=int(price_breakdown.processing_fee * 100),
                platform_fee=platform_fee_satang,
                seller_payout=int(price_breakdown.seller_payout * 100),
                shipping_name=payment_request.shipping.name,
                shipping_phone=payment_request.shipping.phone,
                shipping_address=payment_request.shipping.address,
                shipping_district=payment_request.shipping.district,
                shipping_province=payment_request.shipping.province,
                shipping_postal_code=payment_request.shipping.postal_code,
            )

            # Build return_uri with payment_id
            separator = "&" if "?" in payment_request.return_uri else "?"
            return_uri_with_id = f"{payment_request.return_uri}{separator}payment_id={payment.id}"

            # Only pass platform_fee if Omise Connect is enabled
            settings = get_settings()
            omise_platform_fee = platform_fee_satang if settings.OMISE_CONNECT_ENABLED else None

            # Create Omise charge with payment_id in return_uri and platform_fee for Omise Connect
            charge = self.omise_service.create_charge(
                amount=amount,
                currency=currency,
                card_token=payment_request.token,
                description=f"Purchase: {post.title}",
                return_uri=return_uri_with_id,
                metadata={
                    "post_id": post.id,
                    "buyer_id": buyer.id,
                    "seller_id": post.user_id,
                    "payment_id": payment.id,
                },
                platform_fee=omise_platform_fee,
            )

            # Update payment with charge details
            payment.omise_charge_id = charge.id
            if hasattr(charge, "authorize_uri") and charge.authorize_uri:
                payment.authorize_uri = charge.authorize_uri
            await self.db.commit()
            await self.db.refresh(payment)

            # Determine status and update if needed
            status = PaymentStatus.PENDING
            if charge.status == "successful":
                status = PaymentStatus.SUCCESSFUL
            elif charge.status == "failed":
                status = PaymentStatus.FAILED

            if status != PaymentStatus.PENDING:
                await payment_crud.update_status(
                    self.db,
                    payment=payment,
                    status=status,
                    failure_code=getattr(charge, "failure_code", None),
                    failure_message=getattr(charge, "failure_message", None),
                )

            return PaymentResponse(
                payment_id=payment.id,
                status=status.value.lower(),
                charge_id=charge.id,
                authorize_uri=charge.authorize_uri if hasattr(charge, "authorize_uri") else None,
            )

        except omise.errors.BaseError as e:
            logger.error(f"Omise error during payment: {e}")
            raise bad_request_error(f"Payment failed: {str(e)}")

    async def create_promptpay_payment(
        self, buyer: User, payment_request: CreatePromptPayPaymentRequest
    ) -> PaymentResponse:
        """
        Create a PromptPay payment for a post.

        Args:
            buyer (User): The buyer.
            payment_request (CreatePromptPayPaymentRequest): Payment details.

        Returns:
            PaymentResponse: The payment response with QR code.
        """
        # Get the post
        post = await post_crud.get_by_id(self.db, id=payment_request.post_id)
        if not post:
            raise not_found_error("Post not found")

        # Cannot buy own post
        if post.user_id == buyer.id:
            raise forbidden_error("You cannot purchase your own listing")

        # Check if seller is verified
        seller_profile = await seller_crud.get_by_user_id(
            self.db, user_id=post.user_id
        )
        if (
            not seller_profile
            or seller_profile.verification_status != SellerVerificationStatus.VERIFIED
        ):
            raise bad_request_error("Seller is not verified")

        # Calculate total with all fees using pricing service
        price_breakdown = calculate_order_total(post.price, post.shipping_cost, PaymentMethodType.PROMPTPAY)
        
        # Convert total to satang
        amount = int(price_breakdown.total * 100)
        platform_fee_satang = int(price_breakdown.platform_fee * 100)
        currency = "THB"

        try:
            # Create PromptPay source
            source = self.omise_service.create_promptpay_source(
                amount=amount,
                currency=currency,
            )

            # Only pass platform_fee if Omise Connect is enabled
            settings = get_settings()
            omise_platform_fee = platform_fee_satang if settings.OMISE_CONNECT_ENABLED else None

            # Create charge with source and platform_fee for Omise Connect
            charge = self.omise_service.create_charge_with_source(
                amount=amount,
                currency=currency,
                source_id=source.id,
                description=f"Purchase: {post.title}",
                return_uri=payment_request.return_uri,
                metadata={
                    "post_id": post.id,
                    "buyer_id": buyer.id,
                    "seller_id": post.user_id,
                },
                platform_fee=omise_platform_fee,
            )

            # Get QR code from charge source (not from initial source)
            # The QR code is available on charge.source.scannable_code
            qr_code_uri = None
            charge_source = getattr(charge, "source", None)
            if charge_source:
                scannable_code = getattr(charge_source, "scannable_code", None)
                if scannable_code:
                    image = getattr(scannable_code, "image", None)
                    if image:
                        qr_code_uri = getattr(image, "download_uri", None)
                        logger.info(f"PromptPay QR code URI: {qr_code_uri}")

            # If still no QR code, log the charge structure for debugging
            if not qr_code_uri:
                logger.warning(f"No QR code found in charge. Charge source: {charge_source}")
                # Try alternate path: directly from charge
                if hasattr(charge, "scannable_code"):
                    scannable = charge.scannable_code
                    if hasattr(scannable, "image") and hasattr(scannable.image, "download_uri"):
                        qr_code_uri = scannable.image.download_uri
                        logger.info(f"Got QR from alternate path: {qr_code_uri}")

            # Parse expires_at from string to datetime
            expires_at_str = getattr(charge, "expires_at", None)
            expires_at = None
            if expires_at_str:
                try:
                    # Handle ISO format with Z suffix
                    if isinstance(expires_at_str, str):
                        expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                    else:
                        expires_at = expires_at_str
                except (ValueError, TypeError):
                    logger.warning(f"Could not parse expires_at: {expires_at_str}")

            # Create payment record
            payment = await payment_crud.create_payment(
                self.db,
                buyer_id=buyer.id,
                seller_id=post.user_id,
                post_id=post.id,
                amount=amount,
                currency=currency,
                payment_method=PaymentMethod.PROMPTPAY,
                omise_charge_id=charge.id,
                return_uri=payment_request.return_uri,
                qr_code_uri=qr_code_uri,
                expires_at=expires_at,
                description=f"Purchase: {post.title}",
                # Fee breakdown for accounting (all in satang)
                item_price=int(price_breakdown.item_price * 100),
                shipping_cost=int(price_breakdown.shipping_cost * 100),
                vat_amount=int(price_breakdown.vat_amount * 100),
                processing_fee=int(price_breakdown.processing_fee * 100),
                platform_fee=platform_fee_satang,
                seller_payout=int(price_breakdown.seller_payout * 100),
                # Shipping address
                shipping_name=payment_request.shipping.name,
                shipping_phone=payment_request.shipping.phone,
                shipping_address=payment_request.shipping.address,
                shipping_district=payment_request.shipping.district,
                shipping_province=payment_request.shipping.province,
                shipping_postal_code=payment_request.shipping.postal_code,
            )

            return PaymentResponse(
                payment_id=payment.id,
                status="pending",
                charge_id=charge.id,
                qr_code_uri=qr_code_uri,
                expires_at=expires_at,
            )

        except omise.errors.BaseError as e:
            logger.error(f"Omise error during PromptPay payment: {e}")
            raise bad_request_error(f"Payment failed: {str(e)}")

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

        # Check if status needs updating from Omise
        if (
            payment.status == PaymentStatus.PENDING
            and payment.omise_charge_id
        ):
            try:
                charge = self.omise_service.get_charge(payment.omise_charge_id)

                if charge.status == "successful":
                    await payment_crud.update_status(
                        self.db,
                        payment=payment,
                        status=PaymentStatus.SUCCESSFUL,
                    )
                elif charge.status == "failed":
                    await payment_crud.update_status(
                        self.db,
                        payment=payment,
                        status=PaymentStatus.FAILED,
                        failure_code=getattr(charge, "failure_code", None),
                        failure_message=getattr(charge, "failure_message", None),
                    )
                elif charge.status == "expired":
                    await payment_crud.update_status(
                        self.db,
                        payment=payment,
                        status=PaymentStatus.EXPIRED,
                    )

            except omise.errors.BaseError as e:
                logger.error(f"Error checking Omise charge status: {e}")

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

    async def process_webhook(self, event_key: str, event_data: dict) -> None:
        """
        Process an Omise webhook event.

        Args:
            event_key (str): The event key (e.g., 'charge.complete').
            event_data (dict): The event data.
        """
        logger.info(f"Processing webhook: {event_key}")

        if event_key == "charge.complete":
            await self._handle_charge_complete(event_data)
        elif event_key == "transfer.pay":
            await self._handle_transfer_pay(event_data)
        elif event_key == "recipient.verify":
            await self._handle_recipient_verify(event_data)

    async def _handle_charge_complete(self, data: dict) -> None:
        """Handle charge.complete webhook event."""
        charge_id = data.get("id")
        if not charge_id:
            return

        payment = await payment_crud.get_by_charge_id(self.db, charge_id=charge_id)
        if not payment:
            logger.warning(f"Payment not found for charge {charge_id}")
            return

        status = data.get("status")
        if status == "successful":
            await payment_crud.update_status(
                self.db,
                payment=payment,
                status=PaymentStatus.SUCCESSFUL,
            )
            logger.info(f"Payment {payment.id} marked as successful")
        elif status == "failed":
            await payment_crud.update_status(
                self.db,
                payment=payment,
                status=PaymentStatus.FAILED,
                failure_code=data.get("failure_code"),
                failure_message=data.get("failure_message"),
            )
            logger.info(f"Payment {payment.id} marked as failed")

    async def _handle_transfer_pay(self, data: dict) -> None:
        """Handle transfer.pay webhook event."""
        # Handle transfer completion - could update payment records
        transfer_id = data.get("id")
        logger.info(f"Transfer completed: {transfer_id}")

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
            user = await user_crud.get_by_id_with_relations(self.db, id=seller_profile.user_id)
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
