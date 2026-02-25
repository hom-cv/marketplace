import base64
import hashlib
import hmac
import logging
import time
from typing import Annotated

from app.core.security import get_current_user
from app.core.settings import AnnotatedSettings
from app.models import User
from app.schemas.payment import (
    AddTrackingRequest,
    CreateCardPaymentRequest,
    CreatePromptPayPaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
    PurchaseListItem,
    WebhookEvent,
    WebhookResponse,
)
from app.services.listing_service import AnnotatedListingService
from app.services.payment_service import AnnotatedPaymentService
from fastapi import APIRouter, Depends, Request, status
from pydantic import ValidationError

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/card",
    status_code=status.HTTP_201_CREATED,
    response_model=PaymentResponse,
)
async def create_card_payment(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_request: CreateCardPaymentRequest,
) -> PaymentResponse:
    """
    Create a card payment for a post.

    - **post_id**: ID of the post to purchase
    - **token**: Omise card token from frontend (obtained via Omise.js)
    - **return_uri**: URL to redirect after 3DS authentication

    If 3DS authentication is required, the response will include an
    `authorize_uri` that the user should be redirected to.
    """
    return await payment_service.create_card_payment(
        buyer=current_user,
        payment_request=payment_request,
    )


@router.post(
    "/promptpay",
    status_code=status.HTTP_201_CREATED,
    response_model=PaymentResponse,
)
async def create_promptpay_payment(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_request: CreatePromptPayPaymentRequest,
) -> PaymentResponse:
    """
    Create a PromptPay QR payment for a post.

    - **post_id**: ID of the post to purchase
    - **return_uri**: URL to redirect after payment completion

    The response will include a `qr_code_uri` for the QR code image
    and an `expires_at` timestamp for when the QR code expires.
    """
    return await payment_service.create_promptpay_payment(
        buyer=current_user,
        payment_request=payment_request,
    )


@router.get(
    "/my-purchases",
    status_code=status.HTTP_200_OK,
    response_model=list[PurchaseListItem],
)
async def get_my_purchases(
    current_user: Annotated[User, Depends(get_current_user)],
    listing_service: AnnotatedListingService,
) -> list[PurchaseListItem]:
    """Get all purchases made by the current user."""
    return await listing_service.get_purchases(current_user.id)


@router.get(
    "/my-sales",
    status_code=status.HTTP_200_OK,
    response_model=list[PurchaseListItem],
)
async def get_my_sales(
    current_user: Annotated[User, Depends(get_current_user)],
    listing_service: AnnotatedListingService,
) -> list[PurchaseListItem]:
    """Get all sales made by the current user (as seller)."""
    return await listing_service.get_sales(current_user.id)


@router.post(
    "/{payment_id}/tracking",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def add_tracking(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_id: int,
    request: AddTrackingRequest,
) -> None:
    """
    Add tracking number to a sale (seller action).

    Only the seller can add tracking information.
    """
    await payment_service.add_tracking(
        payment_id=payment_id,
        user=current_user,
        tracking_number=request.tracking_number,
        carrier=request.carrier,
    )


@router.post(
    "/{payment_id}/confirm-delivery",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def confirm_delivery(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_id: int,
) -> None:
    """
    Confirm delivery of an item (buyer action).

    Only the buyer can confirm delivery.
    """
    await payment_service.confirm_delivery(
        payment_id=payment_id,
        user=current_user,
    )


@router.get(
    "/{payment_id}",
    status_code=status.HTTP_200_OK,
    response_model=PaymentStatusResponse,
)
async def get_payment_status(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_id: int,
) -> PaymentStatusResponse:
    """
    Get the status of a payment.

    Only the buyer or seller can view the payment status.
    """
    return await payment_service.get_payment_status(
        payment_id=payment_id,
        user=current_user,
    )


WEBHOOK_TOLERANCE_SECONDS = 300  # 5 minutes


def _verify_webhook_signature(
    body: bytes, signature_header: str, timestamp: str, secret: str
) -> bool:
    """Verify Omise webhook HMAC-SHA256 signature."""
    decoded_secret = base64.b64decode(secret)
    signed_payload = timestamp.encode() + b"." + body
    computed = hmac.new(decoded_secret, signed_payload, hashlib.sha256).hexdigest()
    # Support dual signatures during key rotation (comma-separated)
    signatures = [s.strip() for s in signature_header.split(",")]
    return any(hmac.compare_digest(computed, sig) for sig in signatures)


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
    response_model=WebhookResponse,
)
async def omise_webhook(
    request: Request,
    payment_service: AnnotatedPaymentService,
    settings: AnnotatedSettings,
) -> WebhookResponse:
    """
    Handle Omise webhook events.

    This endpoint receives notifications from Omise about:
    - charge.complete: Payment completed (success or failure)
    - transfer.pay: Transfer to seller completed
    - recipient.verify: Seller verification completed

    Configure this URL in the Omise dashboard under Webhooks.
    """
    body = await request.body()

    # Reject webhooks if secret is not configured
    if not settings.OMISE_WEBHOOK_SECRET:
        logger.error("OMISE_WEBHOOK_SECRET is not configured — rejecting webhook")
        return WebhookResponse(status="error", message="Webhook verification not configured")

    signature = request.headers.get("Omise-Signature", "")
    timestamp = request.headers.get("Omise-Signature-Timestamp", "")
    if not signature or not timestamp:
        missing = [
            name for name, val in [("Omise-Signature", signature), ("Omise-Signature-Timestamp", timestamp)]
            if not val
        ]
        logger.warning(f"Webhook missing headers: {', '.join(missing)}")
        return WebhookResponse(status="error", message=f"Missing header(s): {', '.join(missing)}")

    try:
        ts = int(timestamp)
    except ValueError:
        logger.warning(f"Webhook timestamp is not a valid integer: {timestamp}")
        return WebhookResponse(status="error", message="Invalid timestamp")
    if abs(time.time() - ts) > WEBHOOK_TOLERANCE_SECONDS:
        logger.warning("Webhook timestamp outside tolerance window")
        return WebhookResponse(status="error", message="Timestamp out of range")

    if not _verify_webhook_signature(
        body, signature, timestamp, settings.OMISE_WEBHOOK_SECRET
    ):
        logger.warning("Webhook signature verification failed")
        return WebhookResponse(status="error", message="Invalid signature")

    try:
        webhook_event = WebhookEvent.model_validate_json(body)
        event_data = webhook_event.data.model_dump(exclude_none=True)

        await payment_service.process_webhook(
            event_key=webhook_event.key,
            event_data=event_data,
        )

        return WebhookResponse(status="ok")
    except ValidationError as e:
        logger.error(f"Webhook validation error: {e}")
        return WebhookResponse(status="error", message="Invalid webhook payload")
    except Exception as e:
        logger.error(f"Webhook processing error: {e}")
        return WebhookResponse(status="error", message="Internal error")
