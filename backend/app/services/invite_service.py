"""Invite service for handling seller invite codes."""

import logging
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.invite import InviteStatus
from app.core.exceptions import bad_request_error, not_found_error
from app.crud.invite import AnnotatedInviteCRUD, InviteCRUD
from app.db.utils import get_async_db
from app.models.invite import SellerInvite
from app.models.user import User
from app.schemas.invite import InviteListResponse, InviteResponse

logger = logging.getLogger(__name__)


class InviteService:
    """Service for managing seller invite codes."""

    def __init__(self, db: AsyncSession, invite_crud: InviteCRUD) -> None:
        """Initialize invite service with database session."""
        self.db = db
        self._invite_crud = invite_crud

    async def generate_invites(
        self,
        admin_user: User,
        count: int = 1,
        fee_free_sales: int = 0,
    ) -> list[InviteResponse]:
        """
        Generate new invite codes.

        Args:
            admin_user: The admin generating the invites.
            count: Number of invite codes to generate.
            fee_free_sales: Platform-fee-free sales each code grants.

        Returns:
            List of generated invite responses.
        """
        invites = []
        for _ in range(count):
            invite = await self._invite_crud.create(
                self.db,
                created_by_user_id=admin_user.id,
                fee_free_sales=fee_free_sales,
            )
            invites.append(self._to_response(invite))

        # Commit the whole batch atomically (CRUD only flushes).
        await self.db.commit()

        logger.info(f"Admin {admin_user.id} generated {count} invite codes")
        return invites

    async def validate_and_consume(
        self,
        code: str,
        user_id: int,
    ) -> SellerInvite:
        """
        Validate an invite code and mark it as used.

        Args:
            code: The invite code to validate.
            user_id: The user redeeming the code.

        Returns:
            The updated invite.

        Raises:
            BadRequestError: If code is invalid or already used.
        """
        invite = await self._invite_crud.get_by_code_for_update(self.db, code=code)

        if not invite:
            raise bad_request_error("Invalid invite code")

        if invite.status == InviteStatus.USED:
            raise bad_request_error("Invite code has already been used")

        if invite.status == InviteStatus.REVOKED:
            raise bad_request_error("Invite code has been revoked")

        # Mark as used and commit right away (burns the code; see docstring)
        invite = await self._invite_crud.mark_used(
            self.db,
            invite=invite,
            user_id=user_id,
        )
        await self.db.commit()

        logger.info(f"User {user_id} redeemed invite code {code}")
        return invite

    async def list_invites(
        self,
        status: str | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> InviteListResponse:
        """
        List all invite codes with optional status filter.

        Args:
            status: Optional status filter (active, used, revoked).
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            Paginated list of invites.
        """
        status_enum = None
        if status:
            try:
                status_enum = InviteStatus[status.upper()]
            except KeyError:
                raise bad_request_error(f"Invalid status: {status}")

        invites, total = await self._invite_crud.get_all(
            self.db,
            status=status_enum,
            skip=skip,
            limit=limit,
        )

        return InviteListResponse(
            items=[self._to_response(invite) for invite in invites],
            total=total,
            skip=skip,
            limit=limit,
        )

    async def revoke_invite(self, code: str) -> InviteResponse:
        """
        Revoke an invite code.

        Args:
            code: The invite code to revoke.

        Returns:
            The revoked invite.

        Raises:
            NotFoundError: If code not found.
            BadRequestError: If code already used or revoked.
        """
        invite = await self._invite_crud.get_by_code(self.db, code=code)

        if not invite:
            raise not_found_error("Invite code not found")

        if invite.status == InviteStatus.USED:
            raise bad_request_error("Cannot revoke an already used invite")

        if invite.status == InviteStatus.REVOKED:
            raise bad_request_error("Invite is already revoked")

        invite = await self._invite_crud.revoke(self.db, invite=invite)
        await self.db.commit()
        logger.info(f"Invite code {code} revoked")

        return self._to_response(invite)

    def _to_response(self, invite: SellerInvite) -> InviteResponse:
        """Convert invite model to response schema."""
        return InviteResponse(
            code=invite.code,
            status=invite.status.value.lower(),
            fee_free_sales=invite.fee_free_sales,
            created_date=invite.created_date,
            used_at=invite.used_at,
            created_by_username=invite.created_by.username if invite.created_by else None,
            used_by_username=invite.used_by.username if invite.used_by else None,
        )


def _get_invite_service(
    invite_crud: AnnotatedInviteCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> InviteService:
    """Factory function to create InviteService instance."""
    return InviteService(db, invite_crud)


AnnotatedInviteService = Annotated[InviteService, Depends(_get_invite_service)]
