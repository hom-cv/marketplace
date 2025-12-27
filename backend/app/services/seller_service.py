"""Seller service for handling seller registration and verification."""

import logging
from typing import Annotated

import omise.errors
from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, conflict_error
from app.crud.seller import seller_crud
from app.db.utils import get_async_db
from app.models.seller import SellerProfile, SellerVerificationStatus
from app.models.user import User
from app.schemas.seller import (
    SellerStatusResponse,
    SellerVerificationRequest,
    SellerVerificationResponse,
)
from app.services.invite_service import AnnotatedInviteService, InviteService
from app.services.omise_service import AnnotatedOmiseService, OmiseService

logger = logging.getLogger(__name__)


class SellerService:
    """Service for seller registration and verification operations."""

    def __init__(
        self,
        db: AsyncSession,
        omise_service: OmiseService,
        invite_service: InviteService,
    ) -> None:
        """Initialize seller service with database session."""
        self.db = db
        self.omise_service = omise_service
        self.invite_service = invite_service

    async def register_seller(
        self, user: User, verification_request: SellerVerificationRequest
    ) -> SellerVerificationResponse:
        """
        Register a user as a seller by creating an Omise recipient.

        Args:
            user (User): The user to register as a seller.
            verification_request (SellerVerificationRequest): Bank account details.

        Returns:
            SellerVerificationResponse: The verification status.

        Raises:
            ConflictError: If user already has a seller profile.
            BadRequestError: If bank account verification fails.
        """
        # Check if user already has a seller profile
        existing_profile = await seller_crud.get_by_user_id(self.db, user_id=user.id)
        if existing_profile:
            if (
                existing_profile.verification_status
                == SellerVerificationStatus.VERIFIED
            ):
                raise conflict_error("User is already a verified seller")
            elif (
                existing_profile.verification_status == SellerVerificationStatus.PENDING
            ):
                raise conflict_error("Seller verification is already in progress")

        # Validate and consume invite code
        await self.invite_service.validate_and_consume(
            code=verification_request.invite_code,
            user_id=user.id,
        )

        try:
            # Create Omise recipient
            recipient = self.omise_service.create_recipient(
                name=user.full_name,
                email=user.email_address,
                bank_brand=verification_request.bank_brand,
                bank_account_number=verification_request.bank_account_number,
                bank_account_name=verification_request.bank_account_name,
            )

            # Get last 4 digits of bank account
            bank_last_digits = verification_request.bank_account_number[-4:]

            # Create seller profile
            seller_profile = await seller_crud.create_seller_profile(
                self.db,
                user_id=user.id,
                omise_recipient_id=recipient.id,
                bank_brand=verification_request.bank_brand,
                bank_account_last_digits=bank_last_digits,
                bank_account_name=verification_request.bank_account_name,
            )

            # Check if recipient is already verified by Omise
            if recipient.verified:
                await self._complete_verification(user, seller_profile)
                return SellerVerificationResponse(
                    status="verified",
                    recipient_id=recipient.id,
                    message="Your seller account has been verified successfully!",
                )

            return SellerVerificationResponse(
                status="pending",
                recipient_id=recipient.id,
                message="Your bank account is being verified. This may take a few moments.",
            )

        except omise.errors.BaseError as e:
            logger.error(f"Omise error during seller registration: {e}")
            raise bad_request_error(f"Failed to verify bank account: {str(e)}")

    async def _complete_verification(
        self, user: User, seller_profile: SellerProfile
    ) -> None:
        """
        Complete the seller verification process.

        Args:
            user (User): The user being verified.
            seller_profile (SellerProfile): The seller profile to update.
        """
        # Update seller profile status
        await seller_crud.update_verification_status(
            self.db,
            seller_profile=seller_profile,
            status=SellerVerificationStatus.VERIFIED,
        )

        # Assign SELLER role to user
        await seller_crud.assign_seller_role(self.db, user=user)

        logger.info(f"Seller verification completed for user {user.id}")

    async def check_and_update_verification(self, user: User) -> SellerStatusResponse:
        """
        Check the current verification status and update if changed.

        Args:
            user (User): The user to check.

        Returns:
            SellerStatusResponse: The current seller status.
        """
        seller_profile = await seller_crud.get_by_user_id(self.db, user_id=user.id)

        if not seller_profile:
            return SellerStatusResponse(
                is_seller=False,
                verification_status=None,
            )

        # If pending, check with Omise
        if (
            seller_profile.verification_status == SellerVerificationStatus.PENDING
            and seller_profile.omise_recipient_id
        ):
            try:
                recipient = self.omise_service.get_recipient(
                    seller_profile.omise_recipient_id
                )

                if recipient.verified:
                    await self._complete_verification(user, seller_profile)
                    return SellerStatusResponse(
                        is_seller=True,
                        verification_status="verified",
                        bank_brand=seller_profile.bank_brand,
                        bank_last_digits=seller_profile.bank_account_last_digits,
                        verified_at=seller_profile.verified_at,
                    )
                elif recipient.failure_code:
                    await seller_crud.update_verification_status(
                        self.db,
                        seller_profile=seller_profile,
                        status=SellerVerificationStatus.REJECTED,
                        rejection_reason=recipient.failure_code,
                    )
                    return SellerStatusResponse(
                        is_seller=False,
                        verification_status="rejected",
                        bank_brand=seller_profile.bank_brand,
                        bank_last_digits=seller_profile.bank_account_last_digits,
                    )
            except omise.errors.BaseError as e:
                logger.error(f"Error checking Omise recipient status: {e}")

        return SellerStatusResponse(
            is_seller=seller_profile.verification_status
            == SellerVerificationStatus.VERIFIED,
            verification_status=seller_profile.verification_status.value.lower(),
            bank_brand=seller_profile.bank_brand,
            bank_last_digits=seller_profile.bank_account_last_digits,
            verified_at=seller_profile.verified_at,
        )

    async def get_seller_status(self, user: User) -> SellerStatusResponse:
        """
        Get the current seller status for a user.

        Args:
            user (User): The user to check.

        Returns:
            SellerStatusResponse: The current seller status.
        """
        return await self.check_and_update_verification(user)


def _get_seller_service(
    omise_service: AnnotatedOmiseService,
    invite_service: AnnotatedInviteService,
    db: AsyncSession = Depends(get_async_db),
) -> SellerService:
    """Factory function to create SellerService instance."""
    return SellerService(db, omise_service, invite_service)


AnnotatedSellerService = Annotated[SellerService, Depends(_get_seller_service)]

