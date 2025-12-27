"""CRUD operations for seller invites."""

import secrets
import string
from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite import InviteStatus, SellerInvite


def _generate_invite_code(length: int = 8) -> str:
    """Generate a random invite code."""
    alphabet = string.ascii_uppercase + string.digits
    # Remove ambiguous characters
    alphabet = alphabet.replace("O", "").replace("0", "").replace("I", "").replace("1", "")
    return "".join(secrets.choice(alphabet) for _ in range(length))


class InviteCRUD:
    """CRUD operations for seller invites."""

    async def create(
        self,
        db: AsyncSession,
        *,
        created_by_user_id: int,
    ) -> SellerInvite:
        """Create a new invite code."""
        # Generate unique code
        code = _generate_invite_code()
        
        # Ensure code is unique
        while await self.get_by_code(db, code=code):
            code = _generate_invite_code()

        invite = SellerInvite(
            code=code,
            status=InviteStatus.ACTIVE,
            created_by_user_id=created_by_user_id,
        )
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        return invite

    async def get_by_code(
        self,
        db: AsyncSession,
        *,
        code: str,
    ) -> SellerInvite | None:
        """Get an invite by its code."""
        query = select(SellerInvite).where(SellerInvite.code == code.upper())
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id(
        self,
        db: AsyncSession,
        *,
        invite_id: int,
    ) -> SellerInvite | None:
        """Get an invite by its ID."""
        query = select(SellerInvite).where(SellerInvite.id == invite_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_all(
        self,
        db: AsyncSession,
        *,
        status: InviteStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[SellerInvite], int]:
        """Get all invites with optional status filter."""
        query = select(SellerInvite)
        count_query = select(func.count(SellerInvite.id))

        if status:
            query = query.where(SellerInvite.status == status)
            count_query = count_query.where(SellerInvite.status == status)

        query = query.order_by(SellerInvite.created_date.desc())
        query = query.offset(skip).limit(limit)

        result = await db.execute(query)
        total = await db.scalar(count_query)

        return list(result.scalars().all()), total or 0

    async def mark_used(
        self,
        db: AsyncSession,
        *,
        invite: SellerInvite,
        user_id: int,
    ) -> SellerInvite:
        """Mark an invite as used by a user."""
        invite.status = InviteStatus.USED
        invite.used_by_user_id = user_id
        invite.used_at = datetime.now(timezone.utc)
        
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        return invite

    async def revoke(
        self,
        db: AsyncSession,
        *,
        invite: SellerInvite,
    ) -> SellerInvite:
        """Revoke an invite code."""
        invite.status = InviteStatus.REVOKED
        
        db.add(invite)
        await db.commit()
        await db.refresh(invite)
        return invite


invite_crud = InviteCRUD()
