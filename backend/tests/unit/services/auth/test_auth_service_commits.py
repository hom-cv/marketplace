"""Unit tests: AuthService owns commits (CRUD only flushes).

register_user must commit BEFORE sending the verification email so an email
failure cannot roll back the account (the user can resend); verify_email
commits the verification flip.
"""

from unittest.mock import AsyncMock, MagicMock

from app.schemas.auth import AuthRegisterSchema
from app.services.auth import AuthService


def _register_schema() -> AuthRegisterSchema:
    return AuthRegisterSchema(
        username="alice",
        first_name="Alice",
        last_name="Anderson",
        email_address="alice@example.com",
        password="password123",
    )


def _make_service(parent: MagicMock) -> AuthService:
    """AuthService wired with mocks attached to one parent for call ordering."""
    parent.db = AsyncMock()
    parent.email_service = MagicMock()
    parent.email_service.send_verification_email = MagicMock(return_value=True)
    parent.user_crud = MagicMock()

    created = MagicMock()
    created.id = 1
    created.email_address = "alice@example.com"
    created.first_name = "Alice"
    parent.user_crud.get_by_email = AsyncMock(return_value=None)
    parent.user_crud.get_by_username = AsyncMock(return_value=None)
    parent.user_crud.create_user = AsyncMock(return_value=created)
    parent.user_crud.update_email_verified = AsyncMock(return_value=created)

    return AuthService(
        db=parent.db,
        email_service=parent.email_service,
        user_crud_dep=parent.user_crud,
    )


class TestRegisterUserCommits:
    async def test_commits_once_before_email_send(self):
        parent = MagicMock()
        service = _make_service(parent)

        await service.register_user(_register_schema())

        assert parent.db.commit.await_count == 1
        calls = [str(c) for c in parent.mock_calls]
        commit_idx = next(
            i for i, c in enumerate(calls) if "db.commit" in c
        )
        email_idx = next(
            i for i, c in enumerate(calls) if "send_verification_email" in c
        )
        assert commit_idx < email_idx

    async def test_email_failure_does_not_prevent_registration(self):
        parent = MagicMock()
        service = _make_service(parent)
        parent.email_service.send_verification_email.return_value = False

        user = await service.register_user(_register_schema())

        assert user.id == 1
        assert parent.db.commit.await_count == 1


class TestVerifyEmailCommits:
    async def test_commits_once(self, monkeypatch):
        import app.services.auth as mod

        monkeypatch.setattr(mod, "verify_email_token", lambda token: 1)

        parent = MagicMock()
        service = _make_service(parent)
        unverified = MagicMock()
        unverified.email_verified = False
        parent.user_crud.get_by_id = AsyncMock(return_value=unverified)

        await service.verify_email("token")

        parent.user_crud.update_email_verified.assert_awaited_once()
        assert parent.db.commit.await_count == 1
