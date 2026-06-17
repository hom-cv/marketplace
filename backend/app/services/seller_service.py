"""Seller service for handling Stripe Connect onboarding and verification."""

import logging
from typing import Annotated

import stripe
from fastapi import Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import bad_request_error, conflict_error
from app.core.settings import AnnotatedSettings, Settings
from app.crud.seller import AnnotatedSellerCRUD, SellerCRUD
from app.db.utils import get_async_db
from app.models.seller import SellerProfile, SellerVerificationStatus
from app.models.user import User
from app.schemas.seller import (
    SellerStatusResponse,
    SellerVerificationRequest,
    SellerVerificationResponse,
)
from app.services.invite_service import AnnotatedInviteService, InviteService
from app.services.stripe_service import AnnotatedStripeService, StripeService

logger = logging.getLogger(__name__)


class SellerService:
    """Service for Stripe Connect seller onboarding and verification."""

    def __init__(
        self,
        db: AsyncSession,
        stripe_service: StripeService,
        invite_service: InviteService,
        settings: Settings,
        seller_crud: SellerCRUD,
    ) -> None:
        """Initialize seller service with database session."""
        self.db = db
        self.stripe_service = stripe_service
        self.invite_service = invite_service
        self._settings = settings
        self._seller_crud = seller_crud

    async def register_seller(
        self, user: User, verification_request: SellerVerificationRequest
    ) -> SellerVerificationResponse:
        """
        Register a user as a seller by creating a Stripe Connect Standard account.

        Args:
            user (User): The user to register as a seller.
            verification_request (SellerVerificationRequest): Invite code payload.

        Returns:
            SellerVerificationResponse: Onboarding URL and initial status.

        Raises:
            ConflictError: If user already has a seller profile.
            BadRequestError: If Stripe account creation fails.
        """
        # Check if user already has a seller profile
        existing_profile = await self._seller_crud.get_by_user_id(self.db, user_id=user.id)
        if existing_profile:
            if (
                existing_profile.verification_status
                == SellerVerificationStatus.VERIFIED
            ):
                raise conflict_error("User is already a verified seller")
            if (
                existing_profile.verification_status
                == SellerVerificationStatus.PENDING
            ):
                raise conflict_error("Seller verification is already in progress")

        # Validate and consume invite code
        invite = await self.invite_service.validate_and_consume(
            code=verification_request.invite_code,
            user_id=user.id,
        )

        try:
            account = await self.stripe_service.create_connect_account(
                email=user.email_address,
                # idempotency_key=f"acct-{user.id}",
            )
            link = await self.stripe_service.create_account_link(
                account_id=account.id,
                return_url=self._settings.STRIPE_CONNECT_RETURN_URL,
                refresh_url=self._settings.STRIPE_CONNECT_REFRESH_URL,
            )
        except stripe.StripeError as e:
            logger.error(f"Stripe error during seller registration: {e}")
            raise bad_request_error(f"Failed to create payout account: {str(e)}")

        await self._seller_crud.create_seller_profile(
            self.db,
            user_id=user.id,
            stripe_account_id=account.id,
            fee_free_sales_remaining=invite.fee_free_sales,
        )

        await self.db.commit()

        return SellerVerificationResponse(
            status="pending",
            stripe_account_id=account.id,
            onboarding_url=link.url,
            message="Complete onboarding with Stripe to start selling.",
        )

    async def get_seller_status_for_user(self, user: User) -> SellerStatusResponse:
        """
        Return the current seller status from the DB.

        This is a pure read — the ``account.updated`` webhook is the single
        writer for seller profile state. Onboarding links are generated on
        demand since they're single-use and short-lived.

        Args:
            user (User): The user to check.

        Returns:
            SellerStatusResponse: The current seller status.
        """
        seller_profile = await self._seller_crud.get_by_user_id(self.db, user_id=user.id)

        if not seller_profile:
            return SellerStatusResponse(is_seller=False, verification_status=None)

        is_verified = (
            seller_profile.verification_status == SellerVerificationStatus.VERIFIED
        )
        onboarding_url = await self._pending_onboarding_url(user, seller_profile)

        return SellerStatusResponse(
            is_seller=is_verified,
            verification_status=seller_profile.verification_status.value.lower(),
            charges_enabled=seller_profile.charges_enabled,
            payouts_enabled=seller_profile.payouts_enabled,
            details_submitted=seller_profile.details_submitted,
            verified_at=seller_profile.verified_at,
            fee_free_sales_remaining=seller_profile.fee_free_sales_remaining,
            onboarding_url=onboarding_url,
        )

    async def _pending_onboarding_url(
        self, user: User, seller_profile: SellerProfile
    ) -> str | None:
        """Fresh onboarding link for a pending seller, or None if not applicable."""
        if (
            not seller_profile.stripe_account_id
            or seller_profile.verification_status != SellerVerificationStatus.PENDING
            or seller_profile.details_submitted
        ):
            return None

        try:
            return await self.create_onboarding_refresh_link(user)
        except HTTPException as e:
            logger.error(f"Error creating Stripe link for status response: {e}")

            return None

    async def get_seller_status(self, user: User) -> SellerStatusResponse:
        """Get the current seller status for a user."""
        return await self.get_seller_status_for_user(user)

    async def create_onboarding_refresh_link(self, user: User) -> str:
        """Generate a fresh onboarding link for a pending seller."""
        seller_profile = await self._seller_crud.get_by_user_id(self.db, user_id=user.id)

        if not seller_profile or not seller_profile.stripe_account_id:
            raise bad_request_error("Seller has no Stripe account")

        try:
            link = await self.stripe_service.create_account_link(
                account_id=seller_profile.stripe_account_id,
                return_url=self._settings.STRIPE_CONNECT_RETURN_URL,
                refresh_url=self._settings.STRIPE_CONNECT_REFRESH_URL,
            )
        except stripe.StripeError as e:
            logger.error(f"Failed to refresh Stripe onboarding link: {e}")
            raise bad_request_error("Failed to create onboarding link")

        return link.url


def _get_seller_service(
    stripe_service: AnnotatedStripeService,
    invite_service: AnnotatedInviteService,
    settings: AnnotatedSettings,
    seller_crud: AnnotatedSellerCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> SellerService:
    """Factory function to create SellerService instance."""
    return SellerService(db, stripe_service, invite_service, settings, seller_crud)


AnnotatedSellerService = Annotated[SellerService, Depends(_get_seller_service)]
