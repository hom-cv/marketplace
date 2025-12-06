"""Schemas for email verification."""

from pydantic import BaseModel, EmailStr


class EmailVerificationResponse(BaseModel):
    """Response after successful email verification."""

    message: str
