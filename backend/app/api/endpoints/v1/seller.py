"""Seller API endpoints for Stripe Connect onboarding and verification."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.models import User
from app.schemas.seller import (
    DashboardLinkResponse,
    OnboardingLinkResponse,
    SellerStatusResponse,
    SellerVerificationRequest,
    SellerVerificationResponse,
)
from app.services.seller_service import AnnotatedSellerService

router = APIRouter(prefix="/seller", tags=["seller"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=SellerVerificationResponse,
)
async def register_seller(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: AnnotatedSellerService,
    verification_request: SellerVerificationRequest,
) -> SellerVerificationResponse:
    """
    Register as a seller by creating a Stripe Express account.

    This initiates the seller onboarding process with Stripe Connect.
    You must have a verified email to become a seller.

    The response includes an `onboarding_url` that the frontend should
    redirect the user to. Bank details, identity verification, and KYC
    are collected on Stripe's hosted onboarding page.
    """
    return await seller_service.register_seller(
        user=current_user,
        verification_request=verification_request,
    )


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    response_model=SellerStatusResponse,
)
async def get_seller_status(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: AnnotatedSellerService,
) -> SellerStatusResponse:
    """
    Get the current seller status for the authenticated user.

    Polls Stripe for the latest account state and returns verification
    status plus dashboard / onboarding resume links when applicable.
    """
    return await seller_service.get_seller_status(user=current_user)


@router.get(
    "/onboarding-link",
    status_code=status.HTTP_200_OK,
    response_model=OnboardingLinkResponse,
)
async def get_onboarding_link(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: AnnotatedSellerService,
) -> OnboardingLinkResponse:
    """Generate a fresh Stripe Express onboarding link."""
    url = await seller_service.create_onboarding_refresh_link(user=current_user)
    return OnboardingLinkResponse(onboarding_url=url)


@router.get(
    "/dashboard-link",
    status_code=status.HTTP_200_OK,
    response_model=DashboardLinkResponse,
)
async def get_dashboard_link(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: AnnotatedSellerService,
) -> DashboardLinkResponse:
    """Generate a Stripe Express dashboard login link for the verified seller."""
    url = await seller_service.create_dashboard_link(user=current_user)
    return DashboardLinkResponse(dashboard_url=url)
