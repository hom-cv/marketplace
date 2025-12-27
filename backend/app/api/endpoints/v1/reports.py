"""Report management API endpoints."""

from fastapi import APIRouter, Query, status

from app.core.security import AnnotatedAdminUser, AnnotatedCurrentUser
from app.schemas.report import (
    ReportCreateRequest,
    ReportListResponse,
    ReportResponse,
    ReportReviewRequest,
)
from app.services.moderation_service import AnnotatedModerationService

router = APIRouter(prefix="/reports", tags=["reports"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=ReportResponse,
)
async def submit_report(
    current_user: AnnotatedCurrentUser,
    moderation_service: AnnotatedModerationService,
    request: ReportCreateRequest,
) -> ReportResponse:
    """
    Submit a report for a user or listing.

    - **report_type**: 'user' or 'post'
    - **reported_user_id**: Required if report_type is 'user'
    - **reported_post_id**: Required if report_type is 'post'
    - **reason**: counterfeit, abuse_of_system, prohibited_item, scam
    - **description**: Detailed description of the issue (10-1000 chars)
    """
    return await moderation_service.submit_report(
        reporter_user=current_user,
        report_type=request.report_type,
        reason=request.reason,
        description=request.description,
        reported_user_id=request.reported_user_id,
        reported_post_id=request.reported_post_id,
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=ReportListResponse,
)
async def list_reports(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    status_filter: str | None = Query(
        None,
        alias="status",
        description="Filter by status: pending, reviewed, resolved, dismissed",
    ),
    type_filter: str | None = Query(
        None,
        alias="type",
        description="Filter by type: user, post",
    ),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
) -> ReportListResponse:
    """
    List all reports.

    **Admin only.** Returns paginated list with optional filters.
    """
    return await moderation_service.get_reports(
        status=status_filter,
        report_type=type_filter,
        skip=skip,
        limit=limit,
    )


@router.patch(
    "/{report_id}",
    status_code=status.HTTP_200_OK,
    response_model=ReportResponse,
)
async def review_report(
    admin_user: AnnotatedAdminUser,
    moderation_service: AnnotatedModerationService,
    report_id: int,
    request: ReportReviewRequest,
) -> ReportResponse:
    """
    Review and update a report's status.

    **Admin only.** Sets status to reviewed, resolved, or dismissed.
    """
    return await moderation_service.review_report(
        admin_user=admin_user,
        report_id=report_id,
        status=request.status,
        admin_notes=request.admin_notes,
    )
