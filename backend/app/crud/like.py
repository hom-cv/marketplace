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
        Get like counts and user's like status for multiple posts in a single query.

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

        # Build a single query that gets both count and is_liked status
        # Use bool_or aggregate to check if user has liked each post
        if user_id:
            is_liked_expr = func.bool_or(Like.user_id == user_id).label("is_liked")
        else:
            is_liked_expr = literal(False).label("is_liked")

        # Single query: group by post_id, count likes, check if user liked
        query = (
            select(
                Like.post_id,
                func.count().label("count"),
                is_liked_expr,
            )
            .where(Like.post_id.in_(post_ids))
            .group_by(Like.post_id)
        )
        
        query_result = await db.execute(query)
        rows = query_result.all()

        # Build result dict from query results
        result = {row.post_id: {"count": row.count, "is_liked": bool(row.is_liked)} for row in rows}

        # Fill in missing post_ids with defaults (posts with 0 likes)
        for post_id in post_ids:
            if post_id not in result:
                result[post_id] = {"count": 0, "is_liked": False}

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
        # Define common where clauses to be reused
        common_where = [
            Like.user_id == user_id,
            Post.deleted_at.is_(None),
        ]

        # Count total using a dedicated, simpler query
        count_query = (
            select(func.count())
            .select_from(Post)
            .join(Like, Like.post_id == Post.id)
            .where(*common_where)
        )
        total = await db.scalar(count_query) or 0

        if total == 0:
            return [], 0

        # Fetch paginated results with necessary eager loading
        data_query = (
            select(Post)
            .join(Like, Like.post_id == Post.id)
            .where(*common_where)
            .options(selectinload(Post.user).selectinload(User.seller_profile))
            .order_by(Like.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.scalars(data_query)
        posts = result.all()

        return posts, total


like_crud = LikeCRUD()


def get_like_crud() -> LikeCRUD:
    """Dependency provider for LikeCRUD instance."""
    return like_crud


AnnotatedLikeCRUD = Annotated[LikeCRUD, Depends(get_like_crud)]
