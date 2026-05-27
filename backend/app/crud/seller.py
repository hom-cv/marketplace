"""Seller CRUD operations."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud._base import BaseCRUD
from app.models.seller import SellerProfile, SellerVerificationStatus
from app.models.user import User
from app.models.user_role import RoleType, UserRole, UserToUserRole
from app.schemas.seller import SellerVerificationRequest


class SellerCRUD(BaseCRUD[SellerProfile, SellerVerificationRequest, SellerVerificationRequest]):
    """CRUD operations for SellerProfile model."""

    async def get_by_user_id(
        self, db: AsyncSession, *, user_id: int
    ) -> SellerProfile | None:
        """
        Retrieve a seller profile by user ID.

        Args:
            db (AsyncSession): The asynchronous database session.
            user_id (int): The user ID to search for.

        Returns:
            SellerProfile | None: The seller profile if found, or None.
        """
        query = select(self.model).where(self.model.user_id == user_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_stripe_account_id_for_update(
        self, db: AsyncSession, *, stripe_account_id: str
    ) -> SellerProfile | None:
        """
        Retrieve a seller profile by Stripe account ID with a row-level lock.

        Use in the account.updated / deauthorization webhook handlers so
        concurrent deliveries for the same account serialize on this row,
        preventing lost updates to capability flags and verification status.
        The lock is held until the surrounding transaction commits.
        """
        query = (
            select(self.model)
            .where(self.model.stripe_account_id == stripe_account_id)
            .with_for_update()
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_seller_profile(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        stripe_account_id: str,
    ) -> SellerProfile:
        """
        Create a new seller profile.

        Args:
            db (AsyncSession): The asynchronous database session.
            user_id (int): The user ID.
            stripe_account_id (str): The Stripe Connect account ID.

        Returns:
            SellerProfile: The created seller profile.
        """
        seller_profile = SellerProfile(
            user_id=user_id,
            stripe_account_id=stripe_account_id,
            verification_status=SellerVerificationStatus.PENDING,
        )

        db.add(seller_profile)

        await db.flush()
        await db.refresh(seller_profile)

        return seller_profile

    async def update_account_status(
        self,
        db: AsyncSession,
        *,
        seller_profile: SellerProfile,
        charges_enabled: bool,
        payouts_enabled: bool,
        details_submitted: bool,
    ) -> SellerProfile:
        """
        Sync Stripe Account capability flags onto the seller profile.

        Args:
            db (AsyncSession): The asynchronous database session.
            seller_profile (SellerProfile): The seller profile to update.
            charges_enabled (bool): Whether the account can accept charges.
            payouts_enabled (bool): Whether the account can receive payouts.
            details_submitted (bool): Whether onboarding is complete.

        Returns:
            SellerProfile: The updated seller profile.
        """
        seller_profile.charges_enabled = charges_enabled
        seller_profile.payouts_enabled = payouts_enabled
        seller_profile.details_submitted = details_submitted

        await db.flush()
        await db.refresh(seller_profile)

        return seller_profile

    async def update_verification_status(
        self,
        db: AsyncSession,
        *,
        seller_profile: SellerProfile,
        status: SellerVerificationStatus,
        rejection_reason: str | None = None,
    ) -> SellerProfile:
        """
        Update the verification status of a seller profile.

        Args:
            db (AsyncSession): The asynchronous database session.
            seller_profile (SellerProfile): The seller profile to update.
            status (SellerVerificationStatus): The new status.
            rejection_reason (str | None): Reason for rejection if applicable.

        Returns:
            SellerProfile: The updated seller profile.
        """
        seller_profile.verification_status = status

        if status == SellerVerificationStatus.VERIFIED:
            seller_profile.verified_at = datetime.now(timezone.utc)
        elif status == SellerVerificationStatus.REJECTED:
            seller_profile.rejection_reason = rejection_reason

        await db.flush()
        await db.refresh(seller_profile)

        return seller_profile

    async def assign_seller_role(self, db: AsyncSession, *, user: User) -> User:
        """
        Assign the SELLER role to a user.

        Args:
            db (AsyncSession): The asynchronous database session.
            user (User): The user to assign the role to.

        Returns:
            User: The updated user with SELLER role.
        """
        # Get or create SELLER role
        query = select(UserRole).where(UserRole.role == RoleType.SELLER)
        result = await db.execute(query)
        seller_role = result.scalar_one_or_none()

        if not seller_role:
            seller_role = UserRole(role=RoleType.SELLER)
            db.add(seller_role)
            await db.flush()

        # Check if user already has SELLER role
        if not any(r.role == RoleType.SELLER for r in user.roles):
            user_role_assoc = UserToUserRole(user_id=user.id, role_id=seller_role.id)
            db.add(user_role_assoc)

            await db.flush()

            # Refresh user to get updated roles
            query = select(User).where(User.id == user.id).options(selectinload(User.roles))
            result = await db.execute(query)
            user = result.scalar_one()

        return user


seller_crud = SellerCRUD(SellerProfile)
