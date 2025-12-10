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

    async def get_by_recipient_id(
        self, db: AsyncSession, *, recipient_id: str
    ) -> SellerProfile | None:
        """
        Retrieve a seller profile by Omise recipient ID.

        Args:
            db (AsyncSession): The asynchronous database session.
            recipient_id (str): The Omise recipient ID.

        Returns:
            SellerProfile | None: The seller profile if found, or None.
        """
        query = select(self.model).where(self.model.omise_recipient_id == recipient_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_seller_profile(
        self,
        db: AsyncSession,
        *,
        user_id: int,
        omise_recipient_id: str,
        bank_brand: str,
        bank_account_last_digits: str,
        bank_account_name: str,
    ) -> SellerProfile:
        """
        Create a new seller profile.

        Args:
            db (AsyncSession): The asynchronous database session.
            user_id (int): The user ID.
            omise_recipient_id (str): The Omise recipient ID.
            bank_brand (str): The bank brand code.
            bank_account_last_digits (str): Last 4 digits of bank account.
            bank_account_name (str): Name on bank account.

        Returns:
            SellerProfile: The created seller profile.
        """
        seller_profile = SellerProfile(
            user_id=user_id,
            omise_recipient_id=omise_recipient_id,
            bank_brand=bank_brand,
            bank_account_last_digits=bank_account_last_digits,
            bank_account_name=bank_account_name,
            verification_status=SellerVerificationStatus.PENDING,
        )

        db.add(seller_profile)
        await db.commit()
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

        await db.commit()
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
            await db.commit()

            # Refresh user to get updated roles
            query = select(User).where(User.id == user.id).options(selectinload(User.roles))
            result = await db.execute(query)
            user = result.scalar_one()

        return user


seller_crud = SellerCRUD(SellerProfile)
