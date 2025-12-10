"""Seller schemas for verification requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class SellerVerificationRequest(BaseModel):
    """Schema for initiating seller verification with bank account details."""

    bank_brand: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Bank brand code (e.g., 'kbank', 'bbl', 'scb')",
    )
    bank_account_number: str = Field(
        ...,
        min_length=10,
        max_length=20,
        description="Bank account number",
    )
    bank_account_name: str = Field(
        ...,
        min_length=1,
        max_length=255,
        description="Name on bank account",
    )


class SellerVerificationResponse(BaseModel):
    """Schema for seller verification response."""

    status: str
    recipient_id: str | None = None
    message: str


class SellerStatusResponse(BaseModel):
    """Schema for checking seller status."""

    is_seller: bool
    verification_status: str | None = None
    bank_brand: str | None = None
    bank_last_digits: str | None = None
    verified_at: datetime | None = None

    model_config = {"from_attributes": True}
