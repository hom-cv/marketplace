"""Payment service for handling payment processing."""

import logging

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

        # Convert price to satang (smallest unit for THB)
        amount = int(post.price * 100)
        currency = "THB"

        try:
            # Create Omise charge
            charge = self.omise_service.create_charge(
                amount=amount,
                currency=currency,
                card_token=payment_request.token,
                description=f"Purchase: {post.title}",
                return_uri=payment_request.return_uri,
                metadata={
                    "post_id": post.id,
                    "buyer_id": buyer.id,
                    "seller_id": post.user_id,
                },
            )

            # Determine initial status
            status = PaymentStatus.PENDING
            if charge.status == "successful":
                status = PaymentStatus.SUCCESSFUL
            elif charge.status == "failed":
                status = PaymentStatus.FAILED

            # Create payment record
            payment = await payment_crud.create_payment(
                self.db,
                buyer_id=buyer.id,
                seller_id=post.user_id,
                post_id=post.id,
                amount=amount,
                currency=currency,
                payment_method=PaymentMethod.CARD,
                omise_charge_id=charge.id,
                authorize_uri=charge.authorize_uri if hasattr(charge, "authorize_uri") else None,
                return_uri=payment_request.return_uri,
                description=f"Purchase: {post.title}",
            )

            # Update status if already determined
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

        # Convert price to satang
        amount = int(post.price * 100)
        currency = "THB"

        try:
            # Create PromptPay source
            source = self.omise_service.create_promptpay_source(
                amount=amount,
                currency=currency,
            )

            # Create charge with source
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
            )

            # Get QR code and expiration
            scannable_code = getattr(source, "scannable_code", None)
            qr_code_uri = None
            if scannable_code and hasattr(scannable_code, "image"):
                qr_code_uri = scannable_code.image.download_uri

            expires_at = getattr(charge, "expires_at", None)

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
            user = await user_crud.get_by_id(self.db, id=seller_profile.user_id)
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
