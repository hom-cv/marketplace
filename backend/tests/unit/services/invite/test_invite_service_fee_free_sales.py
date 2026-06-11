"""Unit tests for fee-free sale credits on invite generation."""

from datetime import datetime, timezone
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.constants.invite import InviteStatus
from app.services.invite_service import InviteService


def _make_invite(*, fee_free_sales=0):
    invite = MagicMock()
    invite.code = "ABCD2345"
    invite.status = InviteStatus.ACTIVE
    invite.fee_free_sales = fee_free_sales
    invite.created_date = datetime.now(timezone.utc)
    invite.used_at = None
    invite.created_by = None
    invite.used_by = None
    return invite


@pytest.fixture
def crud(monkeypatch):
    import app.services.invite_service as mod

    invite_crud = SimpleNamespace(
        create=AsyncMock(return_value=_make_invite(fee_free_sales=5)),
    )
    monkeypatch.setattr(mod, "invite_crud", invite_crud)
    return invite_crud


class TestGenerateInvitesWithCredits:
    async def test_passes_fee_free_sales_to_crud(self, crud):
        service = InviteService(db=AsyncMock())
        admin = MagicMock()
        admin.id = 1

        responses = await service.generate_invites(
            admin_user=admin, count=2, fee_free_sales=5
        )

        assert crud.create.await_count == 2
        for call in crud.create.await_args_list:
            assert call.kwargs["fee_free_sales"] == 5
        assert all(r.fee_free_sales == 5 for r in responses)

    async def test_defaults_to_zero_credits(self, crud):
        crud.create.return_value = _make_invite(fee_free_sales=0)
        service = InviteService(db=AsyncMock())
        admin = MagicMock()
        admin.id = 1

        responses = await service.generate_invites(admin_user=admin, count=1)

        assert crud.create.await_args.kwargs["fee_free_sales"] == 0
        assert responses[0].fee_free_sales == 0
