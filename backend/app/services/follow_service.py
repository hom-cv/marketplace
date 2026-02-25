"""Follow service for follower business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, not_found_error
from app.crud.follow import FollowCRUD, get_follow_crud
from app.crud.user import UserCRUD, get_user_crud
from app.db.utils import get_async_db


class FollowService:
    """Service for follow/unfollow business logic."""

    def __init__(
        self,
        db: AsyncSession,
        follow_crud: FollowCRUD,
        user_crud: UserCRUD,
    ) -> None:
        self.db = db
        self._follow_crud = follow_crud
        self._user_crud = user_crud

    async def follow_user(self, *, follower_id: int, following_id: int) -> None:
        """
        Follow a user.

        Raises:
            HTTPException: 400 if trying to follow self.
            HTTPException: 404 if target user not found.
        """
        if follower_id == following_id:
            raise bad_request_error("You cannot follow yourself")

        target_user = await self._user_crud.get_by_id(self.db, id=following_id)
        if not target_user or target_user.is_deleted:
            raise not_found_error("User not found")

        await self._follow_crud.follow_user(
            self.db, follower_id=follower_id, following_id=following_id
        )

    async def unfollow_user(self, *, follower_id: int, following_id: int) -> None:
        """
        Unfollow a user.

        Silently succeeds if not currently following (idempotent).
        """
        await self._follow_crud.unfollow_user(
            self.db, follower_id=follower_id, following_id=following_id
        )


def _get_follow_service(
    follow_crud: Annotated[FollowCRUD, Depends(get_follow_crud)],
    user_crud: Annotated[UserCRUD, Depends(get_user_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> FollowService:
    """Factory function to create FollowService instance."""
    return FollowService(db, follow_crud, user_crud)


AnnotatedFollowService = Annotated[FollowService, Depends(_get_follow_service)]
