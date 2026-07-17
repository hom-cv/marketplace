"""Post CRUD operations."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Annotated, Sequence

from fastapi import Depends
from sqlalchemy import and_, case, false, func, or_, select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.post import SizeGroup
from app.constants.taxonomy import (
    CATEGORY_DEFAULT_SIZE_GROUP,
    SUBCATEGORY_SIZE_GROUP,
)
from app.core.exceptions import server_error
from app.core.utils import normalize_tag, slugify
from app.crud._base import BaseCRUD
from app.models.brand import Brand
from app.models.payment import Payment, PaymentStatus
from app.models.post import Gender, Post, PostCategory, Subcategory
from app.models.post_ban import PostBan
from app.models.tag import Tag
from app.models.user import User
from app.models.user_ban import UserBan
from app.schemas.post import PostCreateSchema, PostUpdateSchema


class PostCRUD(BaseCRUD[Post, PostCreateSchema, PostUpdateSchema]):
    """CRUD operations for Post model."""

    def _post_ban_subquery(self):
        """Build exists subquery to check if a post is banned."""
        return (
            select(PostBan.id)
            .where(PostBan.post_id == self.model.id)
            .where(PostBan.is_active.is_(True))
            .exists()
        )

    def _user_ban_subquery(self):
        """Build exists subquery to check if a user is banned."""
        return (
            select(UserBan.id)
            .where(UserBan.user_id == self.model.user_id)
            .where(UserBan.is_active.is_(True))
            .exists()
        )

    def _ban_status_expressions(self):
        """Build labeled case expressions for ban status columns."""
        is_post_banned_expr = case((self._post_ban_subquery(), 1), else_=0).label(
            "is_post_banned"
        )
        is_user_banned_expr = case((self._user_ban_subquery(), 1), else_=0).label(
            "is_user_banned"
        )
        return is_post_banned_expr, is_user_banned_expr

    def _sold_status_expression(self):
        """Build labeled case expression for sold status column."""
        is_sold_subquery = (
            select(Payment.id)
            .where(Payment.post_id == self.model.id)
            .where(Payment.status == PaymentStatus.SUCCESSFUL)
            .exists()
        )
        return case((is_sold_subquery, 1), else_=0).label("is_sold")

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
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.scalars(query)
        return result.all()

    def _size_group_case(self):
        """SQL expression mapping a post to its SizeGroup (mirrors size_group_for).

        Subcategory overrides precede category defaults, so the first match wins.
        """
        return case(
            *[
                (self.model.subcategory == sub, grp.value)
                for sub, grp in SUBCATEGORY_SIZE_GROUP.items()
            ],
            *[
                (self.model.category == cat, grp.value)
                for cat, grp in CATEGORY_DEFAULT_SIZE_GROUP.items()
            ],
            else_=SizeGroup.ONE_SIZE.value,
        )

    def _apply_size_filter(self, query, sizes: list[str], *, scoped: bool):
        """Group-aware size filter: a size only constrains posts of its own group.

        ``sizes`` are group-qualified tokens ("SHOE-39"), so shoe-39 never excludes
        waist-40 bottoms. When a category/subcategory facet is present (``scoped``),
        posts of groups with no size selected pass through; otherwise a bare size
        filter browses only the selected groups.
        """
        by_group: dict[str, list[str]] = {}
        for token in sizes:
            group, _, value = token.partition("-")
            if value:
                by_group.setdefault(group, []).append(value)
        if not by_group:
            return query

        group_expr = self._size_group_case()
        group_match = or_(
            *[
                and_(group_expr == group, self.model.size.in_(values))
                for group, values in by_group.items()
            ]
        )
        if scoped:
            return query.where(
                or_(group_expr.notin_(list(by_group.keys())), group_match)
            )
        return query.where(group_match)

    async def get_posts_with_filters(
        self,
        db: AsyncSession,
        *,
        skip: int = 0,
        limit: int = 50,
        categories: list[PostCategory] | None = None,
        subcategories: list[Subcategory] | None = None,
        genders: list[Gender] | None = None,
        sizes: list[str] | None = None,
        brand_slugs: list[str] | None = None,
        tags: list[str] | None = None,
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
            categories: Filter by top-level category.
            subcategories: Filter by granular subcategory (leaf).
            genders: Filter by target department (mens/womens/unisex).
            brand_slugs: Filter by brand slug(s).
            tags: Filter by tag name(s); matches posts having any of them.
            min_price: Minimum price filter.
            max_price: Maximum price filter.
            search: Search query for title/description.

        Returns:
            Tuple of (list of (Post, is_sold) tuples, total count).
        """
        # Use helper methods for subqueries
        is_post_banned_subquery = self._post_ban_subquery()
        is_user_banned_subquery = self._user_ban_subquery()
        is_sold_expr = self._sold_status_expression()

        # Base query selecting Post and is_sold
        base_query = (
            select(self.model, is_sold_expr)
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .where(self.model.deleted_at.is_(None))
            .where(~is_post_banned_subquery)  # Exclude banned posts
            .where(~is_user_banned_subquery)  # Exclude posts from banned users
        )

        # Apply filters
        # Category (top) + subcategory are one hierarchical facet: OR them so
        # "All Bottoms" + "Jeans" is a union, not an impossible AND. Other facets
        # still AND across dimensions.
        taxonomy_clauses = []
        if categories:
            taxonomy_clauses.append(self.model.category.in_(categories))
        if subcategories:
            taxonomy_clauses.append(self.model.subcategory.in_(subcategories))
        if taxonomy_clauses:
            base_query = base_query.where(or_(*taxonomy_clauses))

        if genders:
            base_query = base_query.where(self.model.gender.in_(genders))

        if sizes:
            base_query = self._apply_size_filter(
                base_query, sizes, scoped=bool(categories or subcategories)
            )

        if brand_slugs:
            # Normalize so a hand-edited ?brands=Nike still matches "nike".
            # Posts with no brand (NULL = "Other") simply don't match any slug.
            normalized = [n for s in brand_slugs if (n := slugify(s))]
            base_query = base_query.where(
                self.model.brand.has(Brand.slug.in_(normalized))
                if normalized
                else false()
            )

        if tags:
            normalized_tags = [n for t in tags if (n := normalize_tag(t))]
            base_query = base_query.where(
                self.model.tags.any(Tag.name.in_(normalized_tags))
                if normalized_tags
                else false()
            )

        if min_price is not None:
            base_query = base_query.where(self.model.price >= min_price)

        if max_price is not None:
            base_query = base_query.where(self.model.price <= max_price)

        if search:
            search_pattern = f"%{search}%"
            base_query = base_query.where(
                or_(
                    self.model.title.ilike(search_pattern),
                    self.model.description.ilike(search_pattern),
                )
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
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.scalars(query)
        return result.all()

    async def get_by_user_id_with_status(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
        include_deleted: bool = False,
    ) -> list[tuple[Post, bool, bool, bool]]:
        """
        Get all posts by a specific user with ban status and sold status in a single query.

        Avoids N+1 query issue by computing ban status and sold status in the same query.

        Args:
            db: The async database session.
            user_id: The user's ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            List of (Post, is_post_banned, is_user_banned, is_sold) tuples.
        """
        is_post_banned_expr, is_user_banned_expr = self._ban_status_expressions()
        is_sold_expr = self._sold_status_expression()

        query = (
            select(self.model, is_post_banned_expr, is_user_banned_expr, is_sold_expr)
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .where(self.model.user_id == user_id)
            .order_by(self.model.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))

        result = await db.execute(query)
        rows = result.all()

        return [
            (post, bool(is_post_banned), bool(is_user_banned), bool(is_sold))
            for post, is_post_banned, is_user_banned, is_sold in rows
        ]

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
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .where(self.model.id == id)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_with_status(
        self,
        db: AsyncSession,
        *,
        id: int,
        include_deleted: bool = False,
    ) -> tuple[Post, bool, bool, bool] | None:
        """
        Get a post by ID with ban status and sold status in a single query.

        Args:
            db: The async database session.
            id: The post ID.
            include_deleted: If True, include soft-deleted posts.

        Returns:
            Tuple of (Post, is_post_banned, is_user_banned, is_sold) or None if not found.
        """
        is_post_banned_expr, is_user_banned_expr = self._ban_status_expressions()
        is_sold_expr = self._sold_status_expression()

        query = (
            select(self.model, is_post_banned_expr, is_user_banned_expr, is_sold_expr)
            .options(selectinload(self.model.user).selectinload(User.seller_profile))
            .where(self.model.id == id)
        )
        if not include_deleted:
            query = query.where(self.model.deleted_at.is_(None))

        result = await db.execute(query)
        row = result.one_or_none()

        if row is None:
            return None

        post, is_post_banned, is_user_banned, is_sold = row
        return (post, bool(is_post_banned), bool(is_user_banned), bool(is_sold))

    async def get_by_id_for_update(
        self,
        db: AsyncSession,
        *,
        id: int,
    ) -> Post | None:
        """
        Get a post by ID with a row-level lock (no relationships loaded).
        """
        query = select(self.model).where(self.model.id == id).with_for_update()
        result = await db.execute(query)

        return result.scalar_one_or_none()

    async def try_reserve(
        self,
        db: AsyncSession,
        *,
        post_id: int,
        payment_id: int,
        buyer_id: int,
        duration_minutes: int,
    ) -> bool:
        """
        Atomically claim a checkout reservation on a post.

        Returns:
            True if the reservation was claimed, False if someone else holds it
            (or the post is sold/deleted).
        """
        own_payment_ids = (
            select(Payment.id)
            .where(Payment.post_id == post_id)
            .where(Payment.buyer_id == buyer_id)
        )
        sold_subquery = (
            select(Payment.id)
            .where(Payment.post_id == post_id)
            .where(Payment.status == PaymentStatus.SUCCESSFUL)
            .exists()
        )
        stmt = (
            update(self.model)
            .where(self.model.id == post_id)
            .where(self.model.deleted_at.is_(None))
            .where(
                or_(
                    self.model.reserved_by_payment_id.is_(None),
                    self.model.reserved_until < func.now(),
                    self.model.reserved_by_payment_id.in_(own_payment_ids),
                )
            )
            .where(~sold_subquery)
            .values(
                reserved_until=func.now() + timedelta(minutes=duration_minutes),
                reserved_by_payment_id=payment_id,
            )
        )
        result = await db.execute(stmt)

        return result.rowcount == 1

    async def release_reservation(
        self,
        db: AsyncSession,
        *,
        post_id: int,
        payment_id: int,
    ) -> None:
        """
        Release a reservation, but only if it is still held by this payment.

        Conditional on reserved_by_payment_id so a late release (e.g. a failed
        webhook for an old payment) cannot clobber a newer buyer's claim.
        """
        stmt = (
            update(self.model)
            .where(self.model.id == post_id)
            .where(self.model.reserved_by_payment_id == payment_id)
            .values(reserved_until=None, reserved_by_payment_id=None)
        )
        await db.execute(stmt)

    async def clear_reservation(
        self,
        db: AsyncSession,
        *,
        post_id: int,
    ) -> None:
        """
        Unconditionally clear a post's reservation.

        Only for the payment-succeeded path: the post is sold, so whatever
        reservation remains is moot.
        """
        stmt = (
            update(self.model)
            .where(self.model.id == post_id)
            .values(reserved_until=None, reserved_by_payment_id=None)
        )

        await db.execute(stmt)

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
        await db.flush()

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

        await db.flush()

        return post


post_crud = PostCRUD(Post)


def get_post_crud() -> PostCRUD:
    """Dependency provider for PostCRUD instance."""
    return post_crud


AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]
