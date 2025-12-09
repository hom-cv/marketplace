"""Payment API endpoints for processing transactions."""

import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.utils import get_async_db
from app.models import User
from app.schemas.payment import (
    CreateCardPaymentRequest,
    CreatePromptPayPaymentRequest,
    PaymentResponse,
    PaymentStatusResponse,
)
from app.services.payment_service import PaymentService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post(
    "/card",
    status_code=status.HTTP_201_CREATED,
    response_model=PaymentResponse,
)
async def create_card_payment(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
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
    return await PaymentService(db=db).create_card_payment(
        buyer=current_user,
        payment_request=payment_request,
    )


@router.post(
    "/promptpay",
    status_code=status.HTTP_201_CREATED,
    response_model=PaymentResponse,
)
async def create_promptpay_payment(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_request: CreatePromptPayPaymentRequest,
) -> PaymentResponse:
    """
    Create a PromptPay QR payment for a post.

    - **post_id**: ID of the post to purchase
    - **return_uri**: URL to redirect after payment completion

    The response will include a `qr_code_uri` for the QR code image
    and an `expires_at` timestamp for when the QR code expires.
    """
    return await PaymentService(db=db).create_promptpay_payment(
        buyer=current_user,
        payment_request=payment_request,
    )


@router.get(
    "/{payment_id}",
    status_code=status.HTTP_200_OK,
    response_model=PaymentStatusResponse,
)
async def get_payment_status(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_id: int,
) -> PaymentStatusResponse:
    """
    Get the status of a payment.

    Only the buyer or seller can view the payment status.
    """
    return await PaymentService(db=db).get_payment_status(
        payment_id=payment_id,
        user=current_user,
    )


@router.post(
    "/webhook",
    status_code=status.HTTP_200_OK,
)
async def omise_webhook(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    request: Request,
):
    """
    Handle Omise webhook events.

    This endpoint receives notifications from Omise about:
    - charge.complete: Payment completed (success or failure)
    - transfer.pay: Transfer to seller completed
    - recipient.verify: Seller verification completed

    Configure this URL in the Omise dashboard under Webhooks.

    Note: Omise recommends verifying webhook events by making a GET request
    to the Omise API to confirm the status independently. This verification
    is handled in PaymentService.process_webhook().
    """
    try:
        body = await request.json()
        event_key = body.get("key", "")
        event_data = body.get("data", {})

        await PaymentService(db=db).process_webhook(
            event_key=event_key,
            event_data=event_data,
        )

        return {"status": "ok"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}
