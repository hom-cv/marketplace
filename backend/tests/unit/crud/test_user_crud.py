"""Unit tests for UserCRUD.update_profile.

update_profile is a full replacement: it overwrites every editable field with
the value it is given, then flushes and refreshes (the caller owns the commit).
"""

from unittest.mock import AsyncMock, MagicMock

import pytest

from app.crud.user import user_crud
from app.models.user import User


def _make_user() -> MagicMock:
    """A user double pre-populated with the columns update_profile touches."""
    user = MagicMock(spec=User)
    user.username = "alice"
    user.first_name = "Alice"
    user.last_name = "Anderson"
    user.bio = "hello"
    user.show_full_name = True
    return user


@pytest.fixture
def db() -> AsyncMock:
    """An async session double; commit/refresh are awaited no-ops."""
    return AsyncMock()


class TestUpdateProfile:
    async def test_writes_all_supplied_fields(self, db: AsyncMock):
        """Every field is overwritten with the supplied value, then persisted."""
        user = _make_user()

        result = await user_crud.update_profile(
            db,
            user=user,
            username="bob",
            first_name="Bob",
            last_name="Brown",
            bio="new bio",
            show_full_name=False,
        )

        assert user.username == "bob"
        assert user.first_name == "Bob"
        assert user.last_name == "Brown"
        assert user.bio == "new bio"
        assert user.show_full_name is False
        db.flush.assert_awaited_once()
        db.refresh.assert_awaited_once_with(user)
        assert result is user

    async def test_none_bio_clears_the_field(self, db: AsyncMock):
        """A None bio is written through (clears the nullable column)."""
        user = _make_user()

        await user_crud.update_profile(
            db,
            user=user,
            username="alice",
            first_name="Alice",
            last_name="",
            bio=None,
            show_full_name=True,
        )

        assert user.bio is None
        assert user.last_name == ""
