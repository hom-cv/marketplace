"""Post CRUD operations."""

from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Sequence

from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import server_error
from app.crud._base import BaseCRUD
from app.models.payment import Payment, PaymentStatus
from app.models.post import Post
from app.models.user import User
from app.schemas.post import PostCreateSchema, PostUpdateSchema


@dataclass
class PostWithSoldStatus:
    """Post with computed is_sold status."""

    post: Post
    is_sold: bool


class PostCRUD(BaseCRUD[Post, PostCreateSchema, PostUpdateSchema]):
    """CRUD operations for Post model."""

    def _successful_payment_exists_subquery(self, post_id_column):
        """
        Create a correlated subquery to check if a successful payment exists.

        This is used in SELECT to compute is_sold as a scalar subquery.
        """
        return (
            select(Payment.id)
            .where(Payment.post_id == post_id_column)
            .where(Payment.status == PaymentStatus.SUCCESSFUL)
            .exists()
        )

    async def get_all_posts_with_sold_status(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> Sequence[PostWithSoldStatus]:
        """
        Get all posts with pagination and sold status in a single query.

        Uses a correlated subquery to check for successful payments.

        Args:
            db: The async database session.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            Sequence of PostWithSoldStatus containing post and is_sold flag.
        """
        is_sold_subquery = self._successful_payment_exists_subquery(self.model.id)

        query = (
            select(self.model, is_sold_subquery.label("is_sold"))
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))

        result = await db.execute(query)
        rows = result.all()

        return [PostWithSoldStatus(post=row[0], is_sold=row[1]) for row in rows]

    async def get_by_user_id_with_sold_status(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> Sequence[PostWithSoldStatus]:
        """
        Get all posts by a specific user with sold status in a single query.

        Args:
            db: The async database session.
            user_id: The user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            Sequence of PostWithSoldStatus by the user.
        """
        is_sold_subquery = self._successful_payment_exists_subquery(self.model.id)

        query = (
            select(self.model, is_sold_subquery.label("is_sold"))
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

        result = await db.execute(query)
        rows = result.all()

        return [PostWithSoldStatus(post=row[0], is_sold=row[1]) for row in rows]

    async def get_by_id_with_sold_status(
        self,
        db: AsyncSession,
        *,
        id: int,
        include_deleted: bool = False,
    ) -> PostWithSoldStatus | None:
        """
        Get a post by ID with user info and sold status in a single query.

        Args:
            db: The async database session.
            id: The post ID.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            PostWithSoldStatus if found, or None.
        """
        is_sold_subquery = self._successful_payment_exists_subquery(self.model.id)

        query = (
            select(self.model, is_sold_subquery.label("is_sold"))
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .where(self.model.id == id)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))

        result = await db.execute(query)
        row = result.one_or_none()

        if row is None:
            return None

        return PostWithSoldStatus(post=row[0], is_sold=row[1])

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


