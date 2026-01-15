"""Like CRUD operations."""

from typing import Sequence, Annotated
from fastapi import Depends

from sqlalchemy import delete, exists, func, select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.like import Like
from app.models.post import Post
from app.models.user import User


class LikeCRUD:
    """CRUD operations for Like model."""

    async def like_post(
        self, db: AsyncSession, *, user_id: int, post_id: int
    ) -> Like | None:
        """
        Create a like for a post. Returns None if already liked.

        Uses INSERT ... ON CONFLICT DO NOTHING to handle race conditions
        atomically and avoid the need for a separate existence check.

        Args:
            db: The async database session.
            user_id: The user's ID.
            post_id: The post's ID.

        Returns:
            The created Like, or None if already liked.
        """
        stmt = (
            pg_insert(Like)
            .values(user_id=user_id, post_id=post_id)
            .on_conflict_do_nothing(constraint="uq_user_post_like")
            .returning(Like)
        )
        result = await db.execute(stmt)
        await db.commit()

        # If conflict occurred, returning() returns nothing
        like = result.scalar_one_or_none()

        return like

    async def unlike_post(
        self, db: AsyncSession, *, user_id: int, post_id: int
    ) -> bool:
        """
        Remove a like from a post.

        Args:
            db: The async database session.
            user_id: The user's ID.
            post_id: The post's ID.

        Returns:
            True if deleted, False if not found.
        """
        result = await db.execute(
            delete(Like).where(
                Like.user_id == user_id,
                Like.post_id == post_id,
            )
        )
        await db.commit()
        return result.rowcount > 0

    async def check_if_liked(
        self, db: AsyncSession, *, user_id: int, post_id: int
    ) -> bool:
        """
        Check if a user has liked a specific post.

        Args:
            db: The async database session.
            user_id: The user's ID.
            post_id: The post's ID.

        Returns:
            True if liked, False otherwise.
        """
        query = select(
            exists().where(Like.user_id == user_id, Like.post_id == post_id)
        )
        result = await db.scalar(query)
        return bool(result)

    async def get_like_count(self, db: AsyncSession, *, post_id: int) -> int:
        """
        Get the total number of likes for a post.

        Args:
            db: The async database session.
            post_id: The post's ID.

        Returns:
            The like count.
        """
        query = select(func.count()).select_from(Like).where(Like.post_id == post_id)
        result = await db.scalar(query)
        return result or 0

    async def get_likes_for_posts(
        self, db: AsyncSession, *, post_ids: list[int], user_id: int | None = None
    ) -> dict[int, dict]:
        """
        Get like counts and user's like status for multiple posts.

        This is the key method for avoiding N+1 queries when displaying
        lists of posts with like information.

        Args:
            db: The async database session.
            post_ids: List of post IDs to get like info for.
            user_id: Optional user ID to check like status.

        Returns:
            Dict mapping post_id to {"count": int, "is_liked": bool}.
        """
        if not post_ids:
            return {}

        # Get counts for all posts
        count_query = (
            select(Like.post_id, func.count().label("count"))
            .where(Like.post_id.in_(post_ids))
            .group_by(Like.post_id)
        )
        count_result = await db.execute(count_query)
        counts = {row.post_id: row.count for row in count_result.all()}

        # Get user's liked posts (if authenticated)
        user_liked: set[int] = set()
        if user_id:
            liked_query = select(Like.post_id).where(
                Like.user_id == user_id,
                Like.post_id.in_(post_ids),
            )
            liked_result = await db.scalars(liked_query)
            user_liked = set(liked_result.all())

        # Build result dict
        result = {}
        for post_id in post_ids:
            result[post_id] = {
                "count": counts.get(post_id, 0),
                "is_liked": post_id in user_liked,
            }
        return result

    async def get_user_liked_posts(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[Sequence[Post], int]:
        """
        Get all posts liked by a user with pagination.

        Args:
            db: The async database session.
            user_id: The user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Tuple of (posts, total_count).
        """
        # Base query for liked posts
        base_query = (
            select(Post)
            .join(Like, Like.post_id == Post.id)
            .where(Like.user_id == user_id)
            .where(Post.deleted_at.is_(None))
            .options(selectinload(Post.user).selectinload(User.seller_profile))
        )

        # Count total
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await db.scalar(count_query) or 0

        # Fetch paginated results (ordered by when liked, newest first)
        data_query = (
            base_query.order_by(Like.created_date.desc()).offset(skip).limit(limit)
        )
        result = await db.scalars(data_query)
        posts = result.all()

        return posts, total


like_crud = LikeCRUD()


def get_like_crud() -> LikeCRUD:
    """Dependency provider for LikeCRUD instance."""
    return like_crud


AnnotatedLikeCRUD = Annotated[LikeCRUD, Depends(get_like_crud)]
