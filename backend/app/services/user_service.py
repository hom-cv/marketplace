"""User service for profile management business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict_error
from app.crud.user import UserCRUD, get_user_crud
from app.db.utils import get_async_db
from app.models.user import User
from app.schemas.user import UserProfileUpdateSchema


class UserService:
    """Service for user profile operations; owns the commit."""

    def __init__(self, db: AsyncSession, user_crud: UserCRUD) -> None:
        self.db = db
        self._user_crud = user_crud

    async def update_profile(
        self, *, user: User, profile_data: UserProfileUpdateSchema
    ) -> User:
        """
        Update the user's profile fields.

        Normalizes the username to lowercase and enforces uniqueness when it
        changes.

        Raises:
            ConflictError: If the new username is already taken.
        """
        update_kwargs = profile_data.model_dump()

        new_username = update_kwargs["username"].lower()
        update_kwargs["username"] = new_username

        if new_username != user.username.lower():
            user_with_username = await self._user_crud.get_by_username(
                self.db, username=new_username
            )
            if user_with_username is not None and user_with_username.id != user.id:
                raise conflict_error("A user with this username already exists")

        updated_user = await self._user_crud.update_profile(
            self.db,
            user=user,
            **update_kwargs,
        )
        await self.db.commit()

        return updated_user


def _get_user_service(
    user_crud: Annotated[UserCRUD, Depends(get_user_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> UserService:
    """Factory function to create UserService instance."""
    return UserService(db, user_crud)


AnnotatedUserService = Annotated[UserService, Depends(_get_user_service)]
