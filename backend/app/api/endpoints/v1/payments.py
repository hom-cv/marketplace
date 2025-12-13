"""Payment API endpoints for processing transactions."""

from json.decoder import JSONDecodeError
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.ext.asyncio import AsyncSession

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
    PostSummary,
    UserSummary,
)
from app.core.exceptions import forbidden_error, not_found_error
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
    "/my-purchases",
    status_code=status.HTTP_200_OK,
    response_model=list[PurchaseListItem],
)
async def get_my_purchases(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[PurchaseListItem]:
    """
    Get all purchases made by the current user.

    Returns successful payments with post and seller information.
    """
    payments = await payment_crud.get_payments_by_buyer(db, buyer_id=current_user.id)
    
    return [
        PurchaseListItem(
            payment_id=p.id,
            status=p.status.value.lower(),
            amount=p.amount,
            currency=p.currency,
            payment_method=p.payment_method.value.lower(),
            paid_at=p.paid_at,
            created_at=p.created_date,
            post=PostSummary(
                id=p.post.id,
                title=p.post.title,
                image_url=p.post.image_url,
                price=str(p.post.price),
                shipping_cost=str(p.post.shipping_cost) if p.post.shipping_cost else "0",
            ),
            seller=UserSummary(
                id=p.seller.id,
                username=p.seller.username,
            ) if p.seller else None,
            # Fee breakdown
            item_price=p.item_price,
            shipping_cost=p.shipping_cost,
            vat_amount=p.vat_amount,
            processing_fee=p.processing_fee,
            platform_fee=p.platform_fee,
            fulfillment_status=p.fulfillment_status.value.lower() if p.fulfillment_status else None,
            tracking_number=p.tracking_number,
            shipped_at=p.shipped_at,
            delivered_at=p.delivered_at,
            shipping_carrier=p.shipping_carrier.value.lower() if p.shipping_carrier else None,
        )
        for p in payments
    ]


@router.get(
    "/my-sales",
    status_code=status.HTTP_200_OK,
    response_model=list[PurchaseListItem],
)
async def get_my_sales(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[PurchaseListItem]:
    """
    Get all sales made by the current user (as seller).

    Returns successful payments with post and buyer information.
    """
    payments = await payment_crud.get_payments_by_seller(db, seller_id=current_user.id)
    
    return [
        PurchaseListItem(
            payment_id=p.id,
            status=p.status.value.lower(),
            amount=p.amount,
            currency=p.currency,
            payment_method=p.payment_method.value.lower(),
            paid_at=p.paid_at,
            created_at=p.created_date,
            post=PostSummary(
                id=p.post.id,
                title=p.post.title,
                image_url=p.post.image_url,
                price=str(p.post.price),
                shipping_cost=str(p.post.shipping_cost) if p.post.shipping_cost else "0",
            ),
            buyer=UserSummary(
                id=p.buyer.id,
                username=p.buyer.username,
            ) if p.buyer else None,
            # Fee breakdown
            item_price=p.item_price,
            shipping_cost=p.shipping_cost,
            vat_amount=p.vat_amount,
            processing_fee=p.processing_fee,
            platform_fee=p.platform_fee,
            fulfillment_status=p.fulfillment_status.value.lower() if p.fulfillment_status else None,
            tracking_number=p.tracking_number,
            shipped_at=p.shipped_at,
            delivered_at=p.delivered_at,
            shipping_carrier=p.shipping_carrier.value.lower() if p.shipping_carrier else None,
            # Shipping address for seller
            shipping_name=p.shipping_name,
            shipping_phone=p.shipping_phone,
            shipping_address=p.shipping_address,
            shipping_district=p.shipping_district,
            shipping_province=p.shipping_province,
            shipping_postal_code=p.shipping_postal_code,
        )
        for p in payments
    ]


@router.post(
    "/{payment_id}/tracking",
    status_code=status.HTTP_200_OK,
)
async def add_tracking(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_id: int,
    request: AddTrackingRequest,
):
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
        db, payment=payment, tracking_number=request.tracking_number, carrier=request.carrier
    )
    return {"status": "ok", "carrier": request.carrier, "tracking_number": request.tracking_number}


@router.post(
    "/{payment_id}/confirm-delivery",
    status_code=status.HTTP_200_OK,
)
async def confirm_delivery(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    payment_id: int,
):
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
    return {"status": "ok"}


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
    except JSONDecodeError as e:
        logger.error(f"Webhook JSON decode error: {e}")
        return {"status": "error", "message": "Invalid JSON body"}
    except Exception as e:
        logger.error(f"Webhook error: {e}")
        return {"status": "error", "message": str(e)}

