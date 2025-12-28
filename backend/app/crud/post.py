"""Post CRUD operations."""

from datetime import datetime, timezone
from typing import Sequence

from decimal import Decimal

from sqlalchemy import case, exists, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import server_error
from app.crud._base import BaseCRUD
from app.models.post_ban import PostBan
from app.models.user_ban import UserBan
from app.models.payment import Payment, PaymentStatus
from app.models.post import Post, PostType
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

    async def get_posts_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        types: list[PostType] | None = None,
        min_price: Decimal | None = None,
        max_price: Decimal | None = None,
        search: str | None = None,
    ) -> tuple[list[tuple[Post, bool]], int]:
        """
        Get posts with filtering, sorting (sold last), and pagination.

        Posts are sorted by:
        1. Sold status (non-sold first, sold last)
        2. Created date descending (newest first)

        Excludes:
        - Soft-deleted posts
        - Banned posts
        - Posts from banned users

        Args:
            db: The async database session.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            types: Filter by post types.
            min_price: Minimum price filter.
            max_price: Maximum price filter.
            search: Search query for title/description.

        Returns:
            Tuple of (list of (Post, is_sold) tuples, total count).
        """
        # Subquery to determine if a post is sold
        is_sold_subquery = (
            exists()
            .where(Payment.post_id == self.model.id)
            .where(Payment.status == PaymentStatus.SUCCESSFUL)
        )

        # Subquery to check if post is banned
        is_post_banned_subquery = (
            exists()
            .where(PostBan.post_id == self.model.id)
            .where(PostBan.is_active.is_(True))
        )

        # Subquery to check if user is banned
        is_user_banned_subquery = (
            exists()
            .where(UserBan.user_id == self.model.user_id)
            .where(UserBan.is_active.is_(True))
        )

        # Use case() to get a sortable value (0 for non-sold, 1 for sold)
        is_sold_expr = case((is_sold_subquery, 1), else_=0).label("is_sold")

        # Base query selecting Post and is_sold
        base_query = (
            select(self.model, is_sold_expr)
            .options(
                selectinload(self.model.user).selectinload(User.seller_profile)
            )
            .where(self.model.deleted_at.is_(None))
            .where(~is_post_banned_subquery)  # Exclude banned posts
            .where(~is_user_banned_subquery)  # Exclude posts from banned users
        )

        # Apply filters
        if types:
            base_query = base_query.where(self.model.type.in_(types))

        if min_price is not None:
            base_query = base_query.where(self.model.price >= min_price)

        if max_price is not None:
            base_query = base_query.where(self.model.price <= max_price)

        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.where(
                (self.model.title.ilike(search_pattern))
                | (self.model.description.ilike(search_pattern))
            )

        # Count total before pagination
        count_query = select(func.count()).select_from(base_query.subquery())
        total = await db.scalar(count_query) or 0

        # Apply sorting: non-sold first (is_sold=0), then by created_date desc
        data_query = (
            base_query.order_by(is_sold_expr.asc(), self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(data_query)
        rows = result.all()

        # Convert to list of (Post, is_sold bool)
        posts_with_sold = [(row[0], bool(row[1])) for row in rows]

        return posts_with_sold, total

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

    async def get_ban_status(
        self,
        db: AsyncSession,
        *,
        post_id: int,
        user_id: int,
    ) -> tuple[bool, bool]:
        """
        Check if a post or its owner is banned.

        Args:
            db: The async database session.
            post_id: The post ID to check.
            user_id: The user ID to check.

        Returns:
            Tuple of (is_post_banned, is_user_banned).
        """
        # Check ban status in a single query
        ban_status_query = select(
            exists().where(PostBan.post_id == post_id, PostBan.is_active.is_(True)),
            exists().where(UserBan.user_id == user_id, UserBan.is_active.is_(True)),
        )
        is_post_banned, is_user_banned = (await db.execute(ban_status_query)).one()

        return is_post_banned, is_user_banned


post_crud = PostCRUD(Post)

