from typing import Annotated

from fastapi import APIRouter, Depends, Request, status

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
from app.services.stripe_webhook_service import AnnotatedStripeWebhookService

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


@router.post(
    "/{payment_id}/cancel",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def cancel_payment(
    current_user: Annotated[User, Depends(get_current_user)],
    payment_service: AnnotatedPaymentService,
    payment_id: int,
) -> None:
    """
    Cancel a pending payment (buyer action).

    Cancels the Stripe PaymentIntent and releases the post's checkout
    reservation immediately, instead of waiting for it to expire.
    """
    await payment_service.cancel_payment(
        payment_id=payment_id,
        user=current_user,
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
    webhook_service: AnnotatedStripeWebhookService,
    settings: AnnotatedSettings,
) -> WebhookResponse:
    """
    Handle Stripe **platform-account** webhook events (our destination charges).

    Configure in the Stripe Dashboard with the endpoint scoped to *Your account*
    and verify with STRIPE_WEBHOOK_SECRET. Events handled:
    payment_intent.succeeded, payment_intent.payment_failed,
    payment_intent.canceled, charge.refunded, charge.dispute.created,
    charge.dispute.closed.
    """
    event = await webhook_service.verify_event(
        request, settings.STRIPE_WEBHOOK_SECRET
    )

    await webhook_service.process_account_event(event)

    return WebhookResponse(status="ok")


@router.post(
    "/webhook/stripe/connect",
    status_code=status.HTTP_200_OK,
    response_model=WebhookResponse,
)
async def stripe_connect_webhook(
    request: Request,
    webhook_service: AnnotatedStripeWebhookService,
    settings: AnnotatedSettings,
) -> WebhookResponse:
    """
    Handle Stripe **Connect** webhook events for connected seller accounts.

    Configure in the Stripe Dashboard with the endpoint scoped to *Connected
    accounts* and verify with STRIPE_CONNECT_WEBHOOK_SECRET. Events handled:
    account.updated, account.application.deauthorized.
    """
    event = await webhook_service.verify_event(
        request, settings.STRIPE_CONNECT_WEBHOOK_SECRET
    )

    await webhook_service.process_connect_event(event)

    return WebhookResponse(status="ok")
