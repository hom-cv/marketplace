"""Admin API endpoints for bans, dashboard, payouts, and flagged messages."""

from fastapi import APIRouter, Query, status
from pydantic import BaseModel

from app.constants.message_flag import MessageFlagStatus
from app.core.security import AnnotatedAdminUser
from app.schemas.ban import (
    BanPostRequest,
    BanUserRequest,
    PostBanListResponse,
    PostBanResponse,
    UserBanListResponse,
    UserBanResponse,
)
from app.schemas.conversation import ConversationDetailSchema
from app.schemas.message_flag import MessageFlagListResponse, MessageFlagResponse
from app.models.payment import Payment
from app.schemas.payment import (
    PayoutHistoryItem,
    PayoutHistoryListResponse,
    PayoutItem,
    PayoutListResponse,
    PayoutResponse,
)
from app.services.message_service import AnnotatedMessageService
from app.services.moderation_service import AnnotatedModerationService
from app.services.payment_service import AnnotatedPaymentService

router = APIRouter(prefix="/admin", tags=["admin"])


def _payment_to_payout_fields(p: Payment) -> dict:
    """Extract common payout fields from a Payment model."""
    return {
        "payment_id": p.id,
        "seller_id": p.seller_id,
        "seller_username": p.seller.username,
        "buyer_username": p.buyer.username,
        "post_title": p.post.title,
        "amount": p.amount,
        "seller_payout": p.seller_payout or 0,
        "currency": p.currency,
        "payment_method": p.payment_method.value.lower(),
        "paid_at": p.paid_at,
        "delivered_at": p.delivered_at,
    }


class AdminStatsResponse(BaseModel):
    """Dashboard statistics response."""

    pending_reports: int
    active_user_bans: int
    active_post_bans: int
    pending_flags: int
    pending_payouts: int


@router.get(
    "/stats",
    status_code=status.HTTP_200_OK,
    response_model=AdminStatsResponse,
)
async def get_admin_stats(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
) -> AdminStatsResponse:
    """
    Get admin dashboard statistics.

    **Admin only.** Returns counts of pending reports and active bans.
    """
    (
        pending_reports,
        active_user_bans,
        active_post_bans,
        pending_flags,
        pending_payouts,
    ) = await moderation_service.get_admin_stats()

    return AdminStatsResponse(
        pending_reports=pending_reports,
        active_user_bans=active_user_bans,
        active_post_bans=active_post_bans,
        pending_flags=pending_flags,
        pending_payouts=pending_payouts,
    )


@router.post(
    "/bans/users",
    status_code=status.HTTP_201_CREATED,
    response_model=UserBanResponse,
)
async def ban_user(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    request: BanUserRequest,
) -> UserBanResponse:
    """
    Ban a user.

    **Admin only.** Prevents the user from logging in and hides their listings.
    """
    return await moderation_service.ban_user(
        admin_user=admin_user,
        user_id=request.user_id,
        reason=request.reason,
    )


@router.delete(
    "/bans/users/{ban_id}",
    status_code=status.HTTP_200_OK,
    response_model=UserBanResponse,
)
async def lift_user_ban(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    ban_id: int,
) -> UserBanResponse:
    """
    Lift a user ban.

    **Admin only.** Restores the user's access.
    """
    return await moderation_service.lift_user_ban(
        admin_user=admin_user,
        ban_id=ban_id,
    )


@router.get(
    "/bans/users",
    status_code=status.HTTP_200_OK,
    response_model=UserBanListResponse,
)
async def list_user_bans(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    active_only: bool = Query(False, description="Only show active bans"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> UserBanListResponse:
    """
    List all user bans.

    **Admin only.** Returns paginated list of user bans.
    """
    return await moderation_service.get_user_bans(
        active_only=active_only,
        skip=skip,
        limit=limit,
    )


@router.post(
    "/bans/posts",
    status_code=status.HTTP_201_CREATED,
    response_model=PostBanResponse,
)
async def ban_post(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    request: BanPostRequest,
) -> PostBanResponse:
    """
    Ban a post/listing.

    **Admin only.** Hides the listing from the marketplace.
    """
    return await moderation_service.ban_post(
        admin_user=admin_user,
        post_id=request.post_id,
        reason=request.reason,
    )


@router.delete(
    "/bans/posts/{ban_id}",
    status_code=status.HTTP_200_OK,
    response_model=PostBanResponse,
)
async def lift_post_ban(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    ban_id: int,
) -> PostBanResponse:
    """
    Lift a post ban.

    **Admin only.** Makes the listing visible again.
    """
    return await moderation_service.lift_post_ban(
        admin_user=admin_user,
        ban_id=ban_id,
    )


@router.get(
    "/bans/posts",
    status_code=status.HTTP_200_OK,
    response_model=PostBanListResponse,
)
async def list_post_bans(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    active_only: bool = Query(False, description="Only show active bans"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> PostBanListResponse:
    """
    List all post bans.

    **Admin only.** Returns paginated list of post bans.
    """
    return await moderation_service.get_post_bans(
        active_only=active_only,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/flagged-messages",
    status_code=status.HTTP_200_OK,
    response_model=MessageFlagListResponse,
)
async def list_flagged_messages(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    flag_status: MessageFlagStatus | None = Query(None, description="Filter by status"),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> MessageFlagListResponse:
    """
    List flagged messages.

    **Admin only.** Returns paginated list of messages flagged for off-site transaction patterns.
    """
    return await moderation_service.get_flagged_messages(
        status=flag_status,
        skip=skip,
        limit=limit,
    )


@router.patch(
    "/flagged-messages/{flag_id}/dismiss",
    status_code=status.HTTP_200_OK,
    response_model=MessageFlagResponse,
)
async def dismiss_flagged_message(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    flag_id: int,
) -> MessageFlagResponse:
    """
    Dismiss a flagged message.

    **Admin only.** Marks a flag as dismissed after review.
    """
    return await moderation_service.dismiss_flagged_message(
        admin_user=admin_user,
        flag_id=flag_id,
    )


@router.get(
    "/conversations/{conversation_id}",
    status_code=status.HTTP_200_OK,
    response_model=ConversationDetailSchema,
)
async def get_conversation_admin(
    admin_user: AnnotatedAdminUser,
    message_service: AnnotatedMessageService,
    conversation_id: int,
    before_id: int | None = Query(None),
    limit: int = Query(50, ge=1, le=100),
) -> ConversationDetailSchema:
    """
    Get a conversation with messages for admin review.

    **Admin only.** Bypasses participant check so admins can review flagged conversations.
    """
    return await message_service.get_conversation_messages_admin(
        conversation_id=conversation_id,
        before_id=before_id,
        limit=limit,
    )


@router.get(
    "/payouts",
    status_code=status.HTTP_200_OK,
    response_model=PayoutListResponse,
)
async def list_pending_payouts(
    admin_user: AnnotatedAdminUser,
    payment_service: AnnotatedPaymentService,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> PayoutListResponse:
    """
    List payments eligible for payout.

    **Admin only.** Returns successful, delivered payments that haven't been transferred yet.
    """
    payments, total = await payment_service.get_pending_payouts(
        skip=skip, limit=limit
    )

    items = [PayoutItem(**_payment_to_payout_fields(p)) for p in payments]

    return PayoutListResponse(
        items=items, total=total, skip=skip, limit=limit
    )


@router.get(
    "/payouts/history",
    status_code=status.HTTP_200_OK,
    response_model=PayoutHistoryListResponse,
)
async def list_payout_history(
    admin_user: AnnotatedAdminUser,
    payment_service: AnnotatedPaymentService,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> PayoutHistoryListResponse:
    """
    List completed payouts.

    **Admin only.** Returns payments that have been transferred to sellers.
    """
    payments, total = await payment_service.get_completed_payouts(
        skip=skip, limit=limit
    )

    items = [
        PayoutHistoryItem(
            **_payment_to_payout_fields(p),
            transferred_at=p.transferred_at,
            omise_transfer_id=p.omise_transfer_id,
        )
        for p in payments
    ]

    return PayoutHistoryListResponse(
        items=items, total=total, skip=skip, limit=limit
    )


@router.post(
    "/payouts/{payment_id}",
    status_code=status.HTTP_200_OK,
    response_model=PayoutResponse,
)
async def create_payout(
    admin_user: AnnotatedAdminUser,
    payment_service: AnnotatedPaymentService,
    payment_id: int,
) -> PayoutResponse:
    """
    Initiate a payout (Omise transfer) for a payment.

    **Admin only.** Transfers the seller_payout amount to the seller's bank account.
    """
    return await payment_service.create_payout(payment_id)
