"""Unit tests: ModerationService owns commits (CRUD only flushes)."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.models.report import ReportReason, ReportStatus, ReportType
from app.services.moderation_service import ModerationService


def _make_report():
    report = MagicMock()
    report.id = 1
    report.report_type = ReportType.POST
    report.reason = ReportReason.SCAM
    report.description = "desc"
    report.status = ReportStatus.PENDING
    report.created_date = datetime.now(timezone.utc)
    report.reporter = None
    report.reported_user_id = None
    report.reported_user = None
    report.reported_post_id = 2
    report.reported_post = None
    report.reviewed_by = None
    report.reviewed_at = None
    report.admin_notes = None
    return report


def _make_ban():
    ban = MagicMock()
    ban.id = 1
    ban.user_id = 5
    ban.user.username = "banned_user"
    ban.reason = "spam"
    ban.is_active = True
    ban.created_date = datetime.now(timezone.utc)
    ban.banned_by.username = "admin"
    ban.lifted_at = None
    ban.lifted_by = None
    return ban


@pytest.fixture
def cruds():
    report_crud = SimpleNamespace(create=AsyncMock(return_value=_make_report()))
    ban_crud = SimpleNamespace(
        get_active_user_ban=AsyncMock(return_value=None),
        ban_user=AsyncMock(return_value=_make_ban()),
    )
    post_crud = SimpleNamespace(
        get_by_id=AsyncMock(return_value=MagicMock(user_id=99))
    )
    user_crud = SimpleNamespace(get_by_id=AsyncMock(return_value=None))

    return SimpleNamespace(
        report_crud=report_crud,
        ban_crud=ban_crud,
        post_crud=post_crud,
        user_crud=user_crud,
        message_flag_crud=MagicMock(),
    )


class TestCommitOwnership:
    async def test_submit_report_commits_once(self, cruds):
        db = AsyncMock()
        service = ModerationService(
            db=db,
            ban_crud=cruds.ban_crud,
            message_flag_crud=cruds.message_flag_crud,
            post_crud=cruds.post_crud,
            report_crud=cruds.report_crud,
            user_crud=cruds.user_crud,
        )
        reporter = MagicMock()
        reporter.id = 1

        await service.submit_report(
            reporter_user=reporter,
            report_type="post",
            reason="scam",
            description="desc",
            reported_post_id=2,
        )

        cruds.report_crud.create.assert_awaited_once()
        assert db.commit.await_count == 1

    async def test_ban_user_commits_once(self, cruds):
        db = AsyncMock()
        service = ModerationService(
            db=db,
            ban_crud=cruds.ban_crud,
            message_flag_crud=cruds.message_flag_crud,
            post_crud=cruds.post_crud,
            report_crud=cruds.report_crud,
            user_crud=cruds.user_crud,
        )
        admin = MagicMock()
        admin.id = 1
        target = MagicMock()
        target.id = 5
        target.is_admin = False
        cruds.user_crud.get_by_id.return_value = target

        await service.ban_user(admin_user=admin, user_id=5, reason="spam")

        cruds.ban_crud.ban_user.assert_awaited_once()
        assert db.commit.await_count == 1
