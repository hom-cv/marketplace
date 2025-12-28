"""CRUD operations for bans."""

from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.post_ban import PostBan
from app.models.user_ban import UserBan


class BanCRUD:
    """CRUD operations for user and post bans."""

    async def ban_user(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        banned_by_user_id: int,
        reason: str,
    ) -> UserBan:
        """Create a new user ban."""
        ban = UserBan(
            user_id=user_id,
            banned_by_user_id=banned_by_user_id,
            reason=reason,
            is_active=True,
        )
        db.add(ban)
        await db.commit()
        await db.refresh(ban)
        return ban

    async def get_active_user_ban(
        self,
        db: AsyncSession,
        *,
        user_id: int,
    ) -> UserBan | None:
        """Get an active ban for a user, if any."""
        query = select(UserBan).where(
            UserBan.user_id == user_id,
            UserBan.is_active.is_(True),
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_ban_by_id(
        self,
        db: AsyncSession,
        *,
        ban_id: int,
    ) -> UserBan | None:
        """Get a user ban by its ID."""
        query = select(UserBan).where(UserBan.id == ban_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def lift_user_ban(
        self,
        db: AsyncSession,
        *,
        ban: UserBan,
        lifted_by_user_id: int,
    ) -> UserBan:
        """Lift a user ban."""
        ban.is_active = False
        ban.lifted_at = datetime.now(timezone.utc)
        ban.lifted_by_user_id = lifted_by_user_id

        db.add(ban)
        await db.commit()
        await db.refresh(ban)
        return ban

    async def get_all_user_bans(
        self,
        db: AsyncSession,
        *,
        active_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[UserBan], int]:
        """Get all user bans with optional active filter."""
        query = select(UserBan).options(selectinload(UserBan.user))
        count_query = select(func.count(UserBan.id))

        if active_only:
            query = query.where(UserBan.is_active.is_(True))
            count_query = count_query.where(UserBan.is_active.is_(True))

        query = query.order_by(UserBan.created_date.desc())
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        total = await db.scalar(count_query)

        return list(result.scalars().all()), total or 0

    async def get_banned_user_ids(self, db: AsyncSession) -> list[int]:
        """Get all currently banned user IDs."""
        query = select(UserBan.user_id).where(UserBan.is_active.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_active_user_bans(self, db: AsyncSession) -> int:
        """Get count of active user bans."""
        query = select(func.count(UserBan.id)).where(UserBan.is_active.is_(True))
        result = await db.scalar(query)
        return result or 0

    async def ban_post(
        self,
        db: AsyncSession,
        *,
        post_id: int,
        banned_by_user_id: int,
        reason: str,
    ) -> PostBan:
        """Create a new post ban."""
        ban = PostBan(
            post_id=post_id,
            banned_by_user_id=banned_by_user_id,
            reason=reason,
            is_active=True,
        )
        db.add(ban)
        await db.commit()
        await db.refresh(ban)
        return ban

    async def get_active_post_ban(
        self,
        db: AsyncSession,
        *,
        post_id: int,
    ) -> PostBan | None:
        """Get an active ban for a post, if any."""
        query = select(PostBan).where(
            PostBan.post_id == post_id,
            PostBan.is_active.is_(True),
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_post_ban_by_id(
        self,
        db: AsyncSession,
        *,
        ban_id: int,
    ) -> PostBan | None:
        """Get a post ban by its ID."""
        query = select(PostBan).where(PostBan.id == ban_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def lift_post_ban(
        self,
        db: AsyncSession,
        *,
        ban: PostBan,
        lifted_by_user_id: int,
    ) -> PostBan:
        """Lift a post ban."""
        ban.is_active = False
        ban.lifted_at = datetime.now(timezone.utc)
        ban.lifted_by_user_id = lifted_by_user_id

        db.add(ban)
        await db.commit()
        await db.refresh(ban)
        return ban

    async def get_all_post_bans(
        self,
        db: AsyncSession,
        *,
        active_only: bool = False,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[PostBan], int]:
        """Get all post bans with optional active filter."""
        query = select(PostBan).options(selectinload(PostBan.post))
        count_query = select(func.count(PostBan.id))

        if active_only:
            query = query.where(PostBan.is_active.is_(True))
            count_query = count_query.where(PostBan.is_active.is_(True))

        query = query.order_by(PostBan.created_date.desc())
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        total = await db.scalar(count_query)

        return list(result.scalars().all()), total or 0

    async def get_banned_post_ids(self, db: AsyncSession) -> list[int]:
        """Get all currently banned post IDs."""
        query = select(PostBan.post_id).where(PostBan.is_active.is_(True))
        result = await db.execute(query)
        return list(result.scalars().all())

    async def count_active_post_bans(self, db: AsyncSession) -> int:
        """Get count of active post bans."""
        query = select(func.count(PostBan.id)).where(PostBan.is_active.is_(True))
        result = await db.scalar(query)
        return result or 0


ban_crud = BanCRUD()
