"""Post CRUD operations."""

from typing import Sequence

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud._base import BaseCRUD
from app.models.post import Post
from app.schemas.post import PostCreateSchema, PostUpdateSchema


class PostCRUD(BaseCRUD[Post, PostCreateSchema, PostUpdateSchema]):
    """CRUD operations for Post model."""

    async def get_all_posts(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[Post]:
        """
        Get all posts with pagination.

        Args:
            db: The async database session.
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Sequence of posts with user info loaded.
        """
        query = (
            select(self.model)
            .options(selectinload(self.model.user))
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.scalars(query)
        return result.all()

    async def get_by_user_id(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> Sequence[Post]:
        """
        Get all posts by a specific user.

        Args:
            db: The async database session.
            user_id: The user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Sequence of posts by the user.
        """
        query = (
            select(self.model)
            .options(selectinload(self.model.user))
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.scalars(query)
        return result.all()

    async def get_by_id_with_user(
        self,
        db: AsyncSession,
        *,
        id: int,
    ) -> Post | None:
        """
        Get a post by ID with user info loaded.

        Args:
            db: The async database session.
            id: The post ID.

        Returns:
            The post if found, or None.
        """
        query = (
            select(self.model)
            .options(selectinload(self.model.user))
            .where(self.model.id == id)
        )
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

        await db.refresh(post, attribute_names=["user"])

        return post


post_crud = PostCRUD(Post)
