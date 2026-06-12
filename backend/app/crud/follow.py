"""Follow CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import delete, exists, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.follow import Follow
from app.models.user import User


class FollowCRUD:
    """CRUD operations for Follow model."""

    async def follow_user(
        self, db: AsyncSession, *, follower_id: int, following_id: int
    ) -> Follow | None:
        """
        Create a follow relationship. Returns None if already following.

        Uses INSERT ... ON CONFLICT DO NOTHING to handle race conditions
        atomically and avoid the need for a separate existence check.
        """
        stmt = (
            pg_insert(Follow)
            .values(follower_id=follower_id, following_id=following_id)
            .on_conflict_do_nothing(constraint="uq_follower_following")
            .returning(Follow)
        )
        result = await db.execute(stmt)
        return result.scalar_one_or_none()

    async def unfollow_user(
        self, db: AsyncSession, *, follower_id: int, following_id: int
    ) -> bool:
        """
        Remove a follow relationship.
        Returns True if deleted, False if not found.
        """
        result = await db.execute(
            delete(Follow).where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        return result.rowcount > 0

    async def is_following(
        self, db: AsyncSession, *, follower_id: int, following_id: int
    ) -> bool:
        """Check if a user is following another user."""
        query = select(
            exists().where(
                Follow.follower_id == follower_id,
                Follow.following_id == following_id,
            )
        )
        result = await db.scalar(query)
        return bool(result)

    async def get_follower_count(
        self, db: AsyncSession, *, user_id: int
    ) -> int:
        """Get the total number of followers for a user (excludes deleted users)."""
        query = (
            select(func.count())
            .select_from(Follow)
            .join(User, User.id == Follow.follower_id)
            .where(Follow.following_id == user_id, User.deleted_at.is_(None))
        )
        result = await db.scalar(query)
        return result or 0


follow_crud = FollowCRUD()


def get_follow_crud() -> FollowCRUD:
    """Dependency provider for FollowCRUD instance."""
    return follow_crud


AnnotatedFollowCRUD = Annotated[FollowCRUD, Depends(get_follow_crud)]
