"""Schemas for email verification."""

from pydantic import BaseModel, EmailStr


class EmailVerificationResponse(BaseModel):
    """Response after successful email verification."""

    message: str


class ResendVerificationRequest(BaseModel):
    """Request to resend verification email."""

    email_address: EmailStr
