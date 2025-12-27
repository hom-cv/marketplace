"""Moderation service for handling reports and bans."""

import logging
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, conflict_error, not_found_error
from app.crud.ban import ban_crud
from app.crud.post import post_crud
from app.crud.report import report_crud
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.report import ReportReason, ReportStatus, ReportType
from app.models.user import User
from app.schemas.ban import (
    PostBanListResponse,
    PostBanResponse,
    UserBanListResponse,
    UserBanResponse,
)
from app.schemas.report import ReportListResponse, ReportResponse

logger = logging.getLogger(__name__)


class ModerationService:
    """Service for handling reports and bans."""

    def __init__(self, db: AsyncSession) -> None:
        """Initialize moderation service with database session."""
        self.db = db

    # =========================================================================
    # Reports
    # =========================================================================

    async def submit_report(
        self,
        reporter_user: User,
        report_type: str,
        reason: str,
        description: str,
        reported_user_id: int | None = None,
        reported_post_id: int | None = None,
    ) -> ReportResponse:
        """Submit a new report."""
        # Validate report type and target
        if report_type == "user":
            if not reported_user_id:
                raise bad_request_error("reported_user_id is required for user reports")
            # Verify user exists
            user = await user_crud.get_by_id(self.db, reported_user_id)
            if not user:
                raise not_found_error("Reported user not found")
            if user.id == reporter_user.id:
                raise bad_request_error("You cannot report yourself")
            report_type_enum = ReportType.USER
        elif report_type == "post":
            if not reported_post_id:
                raise bad_request_error("reported_post_id is required for post reports")
            # Verify post exists
            post = await post_crud.get_by_id(self.db, reported_post_id)
            if not post:
                raise not_found_error("Reported post not found")
            if post.user_id == reporter_user.id:
                raise bad_request_error("You cannot report your own listing")
            report_type_enum = ReportType.POST
        else:
            raise bad_request_error("Invalid report type")

        # Parse reason
        try:
            reason_enum = ReportReason[reason.upper()]
        except KeyError:
            raise bad_request_error(f"Invalid reason: {reason}")

        report = await report_crud.create(
            self.db,
            reporter_user_id=reporter_user.id,
            report_type=report_type_enum,
            reason=reason_enum,
            description=description,
            reported_user_id=reported_user_id,
            reported_post_id=reported_post_id,
        )

        logger.info(f"User {reporter_user.id} submitted {report_type} report #{report.id}")
        return self._report_to_response(report)

    async def get_reports(
        self,
        status: str | None = None,
        report_type: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> ReportListResponse:
        """Get all reports with optional filters."""
        status_enum = None
        if status:
            try:
                status_enum = ReportStatus[status.upper()]
            except KeyError:
                raise bad_request_error(f"Invalid status: {status}")

        type_enum = None
        if report_type:
            try:
                type_enum = ReportType[report_type.upper()]
            except KeyError:
                raise bad_request_error(f"Invalid report type: {report_type}")

        reports, total = await report_crud.get_all(
            self.db,
            status=status_enum,
            report_type=type_enum,
            skip=skip,
            limit=limit,
        )

        return ReportListResponse(
            items=[self._report_to_response(r) for r in reports],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def review_report(
        self,
        admin_user: User,
        report_id: int,
        status: str,
        admin_notes: str | None = None,
    ) -> ReportResponse:
        """Review and update a report's status."""
        report = await report_crud.get_by_id(self.db, report_id=report_id)
        if not report:
            raise not_found_error("Report not found")

        try:
            status_enum = ReportStatus[status.upper()]
        except KeyError:
            raise bad_request_error(f"Invalid status: {status}")

        if status_enum == ReportStatus.PENDING:
            raise bad_request_error("Cannot set status back to pending")

        report = await report_crud.update_status(
            self.db,
            report=report,
            status=status_enum,
            reviewed_by_user_id=admin_user.id,
            admin_notes=admin_notes,
        )

        logger.info(f"Admin {admin_user.id} reviewed report #{report_id} as {status}")
        return self._report_to_response(report)

    async def get_pending_report_count(self) -> int:
        """Get count of pending reports."""
        return await report_crud.get_pending_count(self.db)

    # =========================================================================
    # User Bans
    # =========================================================================

    async def ban_user(
        self,
        admin_user: User,
        user_id: int,
        reason: str,
    ) -> UserBanResponse:
        """Ban a user."""
        # Verify user exists
        user = await user_crud.get_by_id(self.db, user_id)
        if not user:
            raise not_found_error("User not found")

        if user.id == admin_user.id:
            raise bad_request_error("You cannot ban yourself")

        if user.is_admin:
            raise bad_request_error("Cannot ban admin users")

        # Check if already banned
        existing_ban = await ban_crud.get_active_user_ban(self.db, user_id=user_id)
        if existing_ban:
            raise conflict_error("User is already banned")

        ban = await ban_crud.ban_user(
            self.db,
            user_id=user_id,
            banned_by_user_id=admin_user.id,
            reason=reason,
        )

        logger.info(f"Admin {admin_user.id} banned user {user_id}")
        return self._user_ban_to_response(ban)

    async def lift_user_ban(
        self,
        admin_user: User,
        ban_id: int,
    ) -> UserBanResponse:
        """Lift a user ban."""
        ban = await ban_crud.get_user_ban_by_id(self.db, ban_id=ban_id)
        if not ban:
            raise not_found_error("Ban not found")

        if not ban.is_active:
            raise bad_request_error("Ban is already lifted")

        ban = await ban_crud.lift_user_ban(
            self.db,
            ban=ban,
            lifted_by_user_id=admin_user.id,
        )

        logger.info(f"Admin {admin_user.id} lifted ban #{ban_id}")
        return self._user_ban_to_response(ban)

    async def get_user_bans(
        self,
        active_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> UserBanListResponse:
        """Get all user bans."""
        bans, total = await ban_crud.get_all_user_bans(
            self.db,
            active_only=active_only,
            skip=skip,
            limit=limit,
        )

        return UserBanListResponse(
            items=[self._user_ban_to_response(b) for b in bans],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def check_user_banned(self, user_id: int) -> bool:
        """Check if a user is currently banned."""
        ban = await ban_crud.get_active_user_ban(self.db, user_id=user_id)
        return ban is not None

    # =========================================================================
    # Post Bans
    # =========================================================================

    async def ban_post(
        self,
        admin_user: User,
        post_id: int,
        reason: str,
    ) -> PostBanResponse:
        """Ban a post."""
        # Verify post exists
        post = await post_crud.get_by_id(self.db, post_id)
        if not post:
            raise not_found_error("Post not found")

        # Check if already banned
        existing_ban = await ban_crud.get_active_post_ban(self.db, post_id=post_id)
        if existing_ban:
            raise conflict_error("Post is already banned")

        ban = await ban_crud.ban_post(
            self.db,
            post_id=post_id,
            banned_by_user_id=admin_user.id,
            reason=reason,
        )

        logger.info(f"Admin {admin_user.id} banned post {post_id}")
        return self._post_ban_to_response(ban)

    async def lift_post_ban(
        self,
        admin_user: User,
        ban_id: int,
    ) -> PostBanResponse:
        """Lift a post ban."""
        ban = await ban_crud.get_post_ban_by_id(self.db, ban_id=ban_id)
        if not ban:
            raise not_found_error("Ban not found")

        if not ban.is_active:
            raise bad_request_error("Ban is already lifted")

        ban = await ban_crud.lift_post_ban(
            self.db,
            ban=ban,
            lifted_by_user_id=admin_user.id,
        )

        logger.info(f"Admin {admin_user.id} lifted post ban #{ban_id}")
        return self._post_ban_to_response(ban)

    async def get_post_bans(
        self,
        active_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> PostBanListResponse:
        """Get all post bans."""
        bans, total = await ban_crud.get_all_post_bans(
            self.db,
            active_only=active_only,
            skip=skip,
            limit=limit,
        )

        return PostBanListResponse(
            items=[self._post_ban_to_response(b) for b in bans],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def check_post_banned(self, post_id: int) -> bool:
        """Check if a post is currently banned."""
        ban = await ban_crud.get_active_post_ban(self.db, post_id=post_id)
        return ban is not None

    # =========================================================================
    # Response Helpers
    # =========================================================================

    def _report_to_response(self, report) -> ReportResponse:
        """Convert report model to response schema."""
        return ReportResponse(
            id=report.id,
            report_type=report.report_type.value.lower(),
            reason=report.reason.value.lower(),
            description=report.description,
            status=report.status.value.lower(),
            created_at=report.created_date,
            reporter_username=report.reporter.username if report.reporter else None,
            reported_user_id=report.reported_user_id,
            reported_username=report.reported_user.username if report.reported_user else None,
            reported_post_id=report.reported_post_id,
            reported_post_title=report.reported_post.title if report.reported_post else None,
            reviewed_by_username=report.reviewed_by.username if report.reviewed_by else None,
            reviewed_at=report.reviewed_at,
            admin_notes=report.admin_notes,
        )

    def _user_ban_to_response(self, ban) -> UserBanResponse:
        """Convert user ban model to response schema."""
        return UserBanResponse(
            id=ban.id,
            user_id=ban.user_id,
            username=ban.user.username,
            email=ban.user.email_address,
            reason=ban.reason,
            is_active=ban.is_active,
            created_at=ban.created_date,
            banned_by_username=ban.banned_by.username,
            lifted_at=ban.lifted_at,
            lifted_by_username=ban.lifted_by.username if ban.lifted_by else None,
        )

    def _post_ban_to_response(self, ban) -> PostBanResponse:
        """Convert post ban model to response schema."""
        return PostBanResponse(
            id=ban.id,
            post_id=ban.post_id,
            post_title=ban.post.title,
            seller_username=ban.post.user.username,
            reason=ban.reason,
            is_active=ban.is_active,
            created_at=ban.created_date,
            banned_by_username=ban.banned_by.username,
            lifted_at=ban.lifted_at,
            lifted_by_username=ban.lifted_by.username if ban.lifted_by else None,
        )


def _get_moderation_service(
    db: AsyncSession = Depends(get_async_db),
) -> ModerationService:
    """Factory function to create ModerationService instance."""
    return ModerationService(db)


AnnotatedModerationService = Annotated[ModerationService, Depends(_get_moderation_service)]
