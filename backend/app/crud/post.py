"""Post CRUD operations."""

from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import server_error
from app.crud._base import BaseCRUD
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostCreateSchema, PostUpdateSchema


class PostCRUD(BaseCRUD[Post, PostCreateSchema, PostUpdateSchema]):
    """CRUD operations for Post model."""

    async def get_all_posts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> Sequence[Post]:
        """
        Get all posts with pagination.

        Args:
            db: The async database session.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            Sequence of posts with user info loaded.
        """
        query = (
            select(self.model)
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.scalars(query)
        return result.all()

    async def get_by_user_id(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> Sequence[Post]:
        """
        Get all posts by a specific user.

        Args:
            db: The async database session.
            user_id: The user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            Sequence of posts by the user.
        """
        query = (
            select(self.model)
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.scalars(query)
        return result.all()

    async def get_by_id_with_user(
        self,
        db: AsyncSession,
        *,
        id: int,
        include_deleted: bool = False,
    ) -> Post | None:
        """
        Get a post by ID with user info loaded.

        Args:
            db: The async database session.
            id: The post ID.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            The post if found, or None.
        """
        query = (
            select(self.model)
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .where(self.model.id == id)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_post(
        self,
        db: AsyncSession,
        *,
        post: Post,
    ) -> Post:
        """
        Create a new post in the database.

        Args:
            db: The async database session.
            post: The post instance to create.

        Returns:
            The created post with user info.
        """
        db.add(post)
        await db.commit()

        # Re-fetch with proper eager loading
        created_post = await self.get_by_id_with_user(db, id=post.id)
        if not created_post:
            raise server_error(f"Failed to re-fetch created post with id {post.id}")
        return created_post

    async def soft_delete(
        self,
        db: AsyncSession,
        *,
        post: Post,
    ) -> Post:
        """
        Soft delete a post by setting deleted_at timestamp.

        Args:
            db: The async database session.
            post: The post to soft delete.

        Returns:
            The soft-deleted post.
        """
        post.deleted_at = datetime.now(timezone.utc)
        await db.commit()
        await db.refresh(post)
        return post


post_crud = PostCRUD(Post)

