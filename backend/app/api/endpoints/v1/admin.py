"""Admin API endpoints for bans, dashboard, and flagged messages."""

from app.constants.message_flag import MessageFlagStatus
from app.core.exceptions import bad_request_error, not_found_error
from app.core.security import AnnotatedAdminUser
from app.crud.message_flag import AnnotatedMessageFlagCRUD
from app.schemas.ban import (
    BanPostRequest,
    BanUserRequest,
    PostBanListResponse,
    PostBanResponse,
    UserBanListResponse,
    UserBanResponse,
)
from app.schemas.message_flag import MessageFlagListResponse, MessageFlagResponse
from app.services.moderation_service import AnnotatedModerationService
from fastapi import APIRouter, Query, status
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["admin"])


class AdminStatsResponse(BaseModel):
    """Dashboard statistics response."""

    pending_reports: int
    active_user_bans: int
    active_post_bans: int
    pending_flags: int


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
    ) = await moderation_service.get_admin_stats()

    return AdminStatsResponse(
        pending_reports=pending_reports,
        active_user_bans=active_user_bans,
        active_post_bans=active_post_bans,
        pending_flags=pending_flags,
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


def _flag_to_response(flag: "MessageFlag") -> MessageFlagResponse:
    """Convert a MessageFlag model to response schema."""
    return MessageFlagResponse(
        id=flag.id,
        message_id=flag.message_id,
        conversation_id=flag.conversation_id,
        sender_id=flag.sender_id,
        sender_username=flag.sender.username if flag.sender else "",
        message_content=flag.message.content if flag.message else "",
        matched_patterns=flag.matched_patterns.split(",")
        if flag.matched_patterns
        else [],
        status=flag.status.value,
        created_date=flag.created_date,
        reviewed_by_username=flag.reviewed_by.username if flag.reviewed_by else None,
        reviewed_at=flag.reviewed_at,
    )


@router.get(
    "/flagged-messages",
    status_code=status.HTTP_200_OK,
    response_model=MessageFlagListResponse,
)
async def list_flagged_messages(
    admin_user: AnnotatedAdminUser,
    flag_crud: AnnotatedMessageFlagCRUD,
    moderation_service: AnnotatedModerationService,
    flag_status: str | None = Query(
        None, description="Filter by status: PENDING or DISMISSED"
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> MessageFlagListResponse:
    """
    List flagged messages.

    **Admin only.** Returns paginated list of messages flagged for off-site transaction patterns.
    """
    status_enum = None
    if flag_status:
        try:
            status_enum = MessageFlagStatus[flag_status.upper()]
        except KeyError:
            raise bad_request_error(f"Invalid flag status: {flag_status}")

    flags, total = await flag_crud.get_all(
        moderation_service.db,
        status=status_enum,
        skip=skip,
        limit=limit,
    )

    return MessageFlagListResponse(
        items=[_flag_to_response(f) for f in flags],
        total=total,
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
    flag_crud: AnnotatedMessageFlagCRUD,
    moderation_service: AnnotatedModerationService,
    flag_id: int,
) -> MessageFlagResponse:
    """
    Dismiss a flagged message.

    **Admin only.** Marks a flag as dismissed after review.
    """
    flag = await flag_crud.get_by_id(moderation_service.db, flag_id=flag_id)
    if not flag:
        raise not_found_error("Flagged message not found")

    await flag_crud.dismiss(
        moderation_service.db,
        flag=flag,
        reviewed_by_user_id=admin_user.id,
    )

    flag = await flag_crud.get_by_id(moderation_service.db, flag_id=flag_id)
    return _flag_to_response(flag)
