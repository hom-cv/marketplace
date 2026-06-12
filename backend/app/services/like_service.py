"""Like service for post like/unlike business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.like import LikeCRUD, get_like_crud
from app.db.utils import get_async_db


class LikeService:
    """Service for like/unlike operations; owns the commit."""

    def __init__(self, db: AsyncSession, like_crud: LikeCRUD) -> None:
        self.db = db
        self._like_crud = like_crud

    async def like_post(self, *, user_id: int, post_id: int) -> None:
        """Like a post. Idempotent: does nothing if already liked."""
        await self._like_crud.like_post(self.db, user_id=user_id, post_id=post_id)
        await self.db.commit()

    async def unlike_post(self, *, user_id: int, post_id: int) -> None:
        """Unlike a post. Idempotent: does nothing if not liked."""
        await self._like_crud.unlike_post(self.db, user_id=user_id, post_id=post_id)
        await self.db.commit()


def _get_like_service(
    like_crud: Annotated[LikeCRUD, Depends(get_like_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> LikeService:
    """Factory function to create LikeService instance."""
    return LikeService(db, like_crud)


AnnotatedLikeService = Annotated[LikeService, Depends(_get_like_service)]
