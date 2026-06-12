"""CRUD operations for reports."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.report import ReportReason, ReportStatus, ReportType
from app.models.report import Report


class ReportCRUD:
    """CRUD operations for reports."""

    async def create(
        self,
        db: AsyncSession,
        *,
        reporter_user_id: int,
        report_type: ReportType,
        reason: ReportReason,
        description: str,
        reported_user_id: int | None = None,
        reported_post_id: int | None = None,
    ) -> Report:
        """Create a new report."""
        report = Report(
            reporter_user_id=reporter_user_id,
            report_type=report_type,
            reason=reason,
            description=description,
            reported_user_id=reported_user_id,
            reported_post_id=reported_post_id,
            status=ReportStatus.PENDING,
        )
        db.add(report)
        await db.flush()
        await db.refresh(report)
        return report

    async def get_by_id(
        self,
        db: AsyncSession,
        *,
        report_id: int,
    ) -> Report | None:
        """Get a report by its ID."""
        query = select(Report).where(Report.id == report_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        db: AsyncSession,
        *,
        status: ReportStatus | None = None,
        report_type: ReportType | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[Report], int]:
        """Get all reports with optional filters."""
        query = select(Report).options(
            selectinload(Report.reporter),
            selectinload(Report.reported_user),
            selectinload(Report.reported_post),
        )
        count_query = select(func.count(Report.id))

        if status:
            query = query.where(Report.status == status)
            count_query = count_query.where(Report.status == status)

        if report_type:
            query = query.where(Report.report_type == report_type)
            count_query = count_query.where(Report.report_type == report_type)

        query = query.order_by(Report.created_date.desc())
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        total = await db.scalar(count_query)

        return list(result.scalars().all()), total or 0

    async def update_status(
        self,
        db: AsyncSession,
        *,
        report: Report,
        status: ReportStatus,
        reviewed_by_user_id: int,
        admin_notes: str | None = None,
    ) -> Report:
        """Update a report's status after review."""
        report.status = status
        report.reviewed_by_user_id = reviewed_by_user_id
        report.reviewed_at = datetime.now(timezone.utc)
        if admin_notes:
            report.admin_notes = admin_notes

        db.add(report)
        await db.flush()
        await db.refresh(report)
        return report

    async def get_pending_count(self, db: AsyncSession) -> int:
        """Get count of pending reports."""
        query = select(func.count(Report.id)).where(
            Report.status == ReportStatus.PENDING
        )
        return await db.scalar(query) or 0


report_crud = ReportCRUD()
