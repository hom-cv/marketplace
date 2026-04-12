import logging
from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status

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
    WebhookResponse,
)
from app.services.listing_service import AnnotatedListingService
from app.services.payment_service import AnnotatedPaymentService
from app.services.stripe_service import AnnotatedStripeService

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
    Create a card PaymentIntent for a post.

    - **post_id**: ID of the post to purchase
    - **shipping**: Shipping address details

    Returns a `client_secret` that the frontend confirms via Stripe.js.
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
    Create a PromptPay PaymentIntent for a post.

    - **post_id**: ID of the post to purchase
    - **shipping**: Shipping address details

    Returns a `client_secret`. The frontend confirms the intent with
    Stripe.js, which returns the PromptPay QR code via `next_action`.
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


@router.post(
    "/webhook/stripe",
    status_code=status.HTTP_200_OK,
    response_model=WebhookResponse,
)
async def stripe_webhook(
    request: Request,
    stripe_service: AnnotatedStripeService,
    payment_service: AnnotatedPaymentService,
    settings: AnnotatedSettings,
) -> WebhookResponse:
    """
    Handle Stripe webhook events.

    Configure this URL in the Stripe dashboard (Developers → Webhooks).
    Events handled: payment_intent.succeeded, payment_intent.payment_failed,
    charge.refunded, account.updated.
    """
    if not settings.STRIPE_WEBHOOK_SECRET:
        logger.error("STRIPE_WEBHOOK_SECRET is not configured — rejecting webhook")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook secret not configured",
        )

    payload = await request.body()
    sig_header = request.headers.get("Stripe-Signature", "")

    try:
        event = stripe_service.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
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

    try:
        await payment_service.process_webhook(event)
    except Exception as e:
        logger.error(f"Stripe webhook processing error: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Webhook processing error",
        ) from e

    return WebhookResponse(status="ok")
