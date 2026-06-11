"""Unit tests: InviteService owns commits (CRUD only flushes)."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.constants.invite import InviteStatus
from app.services.invite_service import InviteService


def _make_invite(*, status=InviteStatus.ACTIVE):
    invite = MagicMock()
    invite.code = "ABCD2345"
    invite.status = status
    invite.fee_free_sales = 0
    invite.created_date = datetime.now(timezone.utc)
    invite.used_at = None
    invite.created_by = None
    invite.used_by = None
    return invite


@pytest.fixture
def crud(monkeypatch):
    import app.services.invite_service as mod

    invite_crud = SimpleNamespace(
        create=AsyncMock(return_value=_make_invite()),
        get_by_code=AsyncMock(return_value=None),
        get_by_code_for_update=AsyncMock(return_value=None),
        mark_used=AsyncMock(),
        revoke=AsyncMock(),
    )
    monkeypatch.setattr(mod, "invite_crud", invite_crud)
    return invite_crud


class TestCommitOwnership:
    async def test_generate_invites_commits_batch_once(self, crud):
        db = AsyncMock()
        service = InviteService(db=db)
        admin = MagicMock()
        admin.id = 1

        await service.generate_invites(admin_user=admin, count=3)

        assert crud.create.await_count == 3
        assert db.commit.await_count == 1

    async def test_validate_and_consume_locks_row_and_commits(self, crud):
        # Redemption commits immediately (burns the code even if the
        # caller's later steps fail — accepted trade-off); the locked read
        # serializes concurrent redemptions of the same code.
        invite = _make_invite()
        crud.get_by_code_for_update.return_value = invite
        crud.mark_used.return_value = invite
        db = AsyncMock()
        service = InviteService(db=db)

        result = await service.validate_and_consume(code="ABCD2345", user_id=9)

        crud.get_by_code_for_update.assert_awaited_once_with(db, code="ABCD2345")
        crud.mark_used.assert_awaited_once()
        assert db.commit.await_count == 1
        assert result is invite

    async def test_validate_and_consume_rejects_used_code(self, crud):
        crud.get_by_code_for_update.return_value = _make_invite(
            status=InviteStatus.USED
        )
        service = InviteService(db=AsyncMock())

        with pytest.raises(Exception, match="already been used"):
            await service.validate_and_consume(code="ABCD2345", user_id=9)
        crud.mark_used.assert_not_awaited()

    async def test_revoke_invite_commits_once(self, crud):
        invite = _make_invite()
        crud.get_by_code.return_value = invite
        crud.revoke.return_value = invite
        db = AsyncMock()
        service = InviteService(db=db)

        await service.revoke_invite(code="ABCD2345")

        crud.revoke.assert_awaited_once()
        assert db.commit.await_count == 1
