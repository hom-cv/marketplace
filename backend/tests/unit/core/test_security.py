"""Unit tests for the authentication dependencies in app.core.security.

Focus: an account pending email verification (UserStatus.PENDING) must be
rejected by get_current_user but allowed through get_current_user_allow_unverified
so the onboarding endpoints (/auth/me, resend verification) stay reachable.
"""

from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from fastapi import HTTPException

from app.core.security import (
    get_current_user,
    get_current_user_allow_unverified,
)
from app.models.user import UserStatus


def _make_user(status: UserStatus = UserStatus.PENDING) -> MagicMock:
    user = MagicMock()
    user.id = 1
    user.status = status
    user.is_active = status == UserStatus.ACTIVE
    user.is_deleted = False
    return user


@pytest.fixture
def patched_lookups():
    """Patch token decoding and the CRUD singletons used by the dependencies."""
    with (
        patch("app.core.security.decode_access_token") as decode,
        patch("app.core.security.user_crud") as user_crud,
        patch("app.core.security.ban_crud") as ban_crud,
    ):
        decode.return_value = {"sub": "access", "user_id": 1}
        ban_crud.get_active_user_ban = AsyncMock(return_value=None)
        yield decode, user_crud, ban_crud


async def test_get_current_user_rejects_pending_with_403(patched_lookups):
    """Unverified (PENDING) accounts get 403."""
    _, user_crud, _ = patched_lookups
    user_crud.get_by_id_with_relations = AsyncMock(
        return_value=_make_user(UserStatus.PENDING)
    )

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user(db=AsyncMock(), token="token")

    assert exc_info.value.status_code == 403


async def test_allow_unverified_permits_pending(patched_lookups):
    """The onboarding dependency must let an unverified (PENDING) account through."""
    _, user_crud, _ = patched_lookups
    pending_user = _make_user(UserStatus.PENDING)
    user_crud.get_by_id_with_relations = AsyncMock(return_value=pending_user)

    result = await get_current_user_allow_unverified(db=AsyncMock(), token="token")

    assert result is pending_user


async def test_allow_unverified_still_rejects_deleted(patched_lookups):
    """Allowing unverified accounts must not let deleted accounts through."""
    _, user_crud, _ = patched_lookups
    deleted_user = _make_user(UserStatus.PENDING)
    deleted_user.is_deleted = True
    user_crud.get_by_id_with_relations = AsyncMock(return_value=deleted_user)

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_allow_unverified(db=AsyncMock(), token="token")

    assert exc_info.value.status_code == 401


async def test_allow_unverified_still_rejects_banned(patched_lookups):
    """Allowing unverified accounts must not let banned accounts through."""
    _, user_crud, ban_crud = patched_lookups
    user_crud.get_by_id_with_relations = AsyncMock(
        return_value=_make_user(UserStatus.PENDING)
    )
    ban_crud.get_active_user_ban = AsyncMock(return_value=MagicMock())

    with pytest.raises(HTTPException) as exc_info:
        await get_current_user_allow_unverified(db=AsyncMock(), token="token")

    assert exc_info.value.status_code == 401
