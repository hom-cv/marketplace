"""Seller schemas for verification requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class SellerVerificationRequest(BaseModel):
    """Schema for initiating seller verification via Stripe Connect onboarding."""

    invite_code: str = Field(
        ...,
        min_length=6,
        max_length=16,
        description="Invite code required to become a seller",
    )


class SellerVerificationResponse(BaseModel):
    """Schema for seller verification response."""

    status: str
    stripe_account_id: str | None = None
    onboarding_url: str | None = Field(
        default=None,
        description="One-time URL to complete Stripe Connect onboarding",
    )
    message: str


class SellerStatusResponse(BaseModel):
    """Schema for checking seller status."""

    is_seller: bool
    verification_status: str | None = None
    charges_enabled: bool = False
    payouts_enabled: bool = False
    details_submitted: bool = False
    verified_at: datetime | None = None
    onboarding_url: str | None = Field(
        default=None,
        description="One-time URL to resume Stripe Connect onboarding (pending sellers only)",
    )

    model_config = {"from_attributes": True}


class OnboardingLinkResponse(BaseModel):
    """Schema returned when a fresh Stripe onboarding link is generated."""

    onboarding_url: str
