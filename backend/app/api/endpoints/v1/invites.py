"""Invite management API endpoints (Admin only)."""

from fastapi import APIRouter, Query, status

from app.core.security import AnnotatedAdminUser
from app.schemas.invite import InviteCreateRequest, InviteListResponse, InviteResponse
from app.services.invite_service import AnnotatedInviteService

router = APIRouter(prefix="/invites", tags=["invites"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=list[InviteResponse],
)
async def generate_invites(
    admin_user: AnnotatedAdminUser,
    invite_service: AnnotatedInviteService,
    request: InviteCreateRequest,
) -> list[InviteResponse]:
    """
    Generate new seller invite codes.

    **Admin only.** Generates 1-50 invite codes at once.
    """
    return await invite_service.generate_invites(
        admin_user=admin_user,
        count=request.count,
        fee_free_sales=request.fee_free_sales,
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=InviteListResponse,
)
async def list_invites(
    admin_user: AnnotatedAdminUser,
    invite_service: AnnotatedInviteService,
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Filter by status: active, used, revoked",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> InviteListResponse:
    """
    List all invite codes.

    **Admin only.** Returns paginated list of invite codes with optional status filter.
    """
    return await invite_service.list_invites(
        status=status_filter,
        skip=skip,
        limit=limit,
    )


@router.delete(
    "/{code}",
    status_code=status.HTTP_200_OK,
    response_model=InviteResponse,
)
async def revoke_invite(
    admin_user: AnnotatedAdminUser,
    invite_service: AnnotatedInviteService,
    code: str,
) -> InviteResponse:
    """
    Revoke an invite code.

    **Admin only.** Prevents the code from being used.
    """
    return await invite_service.revoke_invite(code=code)
