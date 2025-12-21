import logging
from typing import Annotated

from app.core.exceptions import forbidden_error, not_found_error
from app.core.security import get_current_user
from app.crud.payment import payment_crud
from app.db.utils import get_async_db
from app.models import User
from app.models.payment import PaymentStatus
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
from fastapi import APIRouter, Depends, status
from pydantic import ValidationError
from sqlalchemy.ext.asyncio import AsyncSession

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
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_id: int,
    request: AddTrackingRequest,
) -> None:
    """
    Add tracking number to a sale (seller action).

    Only the seller can add tracking information.
    """
    payment = await payment_crud.get_by_id(db, id=payment_id)
    if not payment:
        raise not_found_error("Payment not found")

    if payment.seller_id != current_user.id:
        raise forbidden_error("Only the seller can add tracking information")

    if payment.status != PaymentStatus.SUCCESSFUL:
        raise forbidden_error("Can only add tracking to successful payments")

    await payment_crud.add_tracking_number(
        db,
        payment=payment,
        tracking_number=request.tracking_number,
        carrier=request.carrier,
    )


@router.post(
    "/{payment_id}/confirm-delivery",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def confirm_delivery(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_id: int,
) -> None:
    """
    Confirm delivery of an item (buyer action).

    Only the buyer can confirm delivery.
    """
    payment = await payment_crud.get_by_id(db, id=payment_id)
    if not payment:
        raise not_found_error("Payment not found")

    if payment.buyer_id != current_user.id:
        raise forbidden_error("Only the buyer can confirm delivery")

    if payment.status != PaymentStatus.SUCCESSFUL:
        raise forbidden_error("Can only confirm delivery for successful payments")

    await payment_crud.confirm_delivery(db, payment=payment)


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
    "/webhook",
    status_code=status.HTTP_200_OK,
    response_model=WebhookResponse,
)
async def omise_webhook(
    payment_service: AnnotatedPaymentService,
    webhook_event: WebhookEvent,
) -> WebhookResponse:
    """
    Handle Omise webhook events.

    This endpoint receives notifications from Omise about:
    - charge.complete: Payment completed (success or failure)
    - transfer.pay: Transfer to seller completed
    - recipient.verify: Seller verification completed

    Configure this URL in the Omise dashboard under Webhooks.
    """
    try:
        # Convert validated model data to dict for service layer
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
        logger.error(f"Webhook error: {e}")
        return WebhookResponse(status="error", message=str(e))
