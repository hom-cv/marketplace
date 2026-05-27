"""Schemas for email verification."""

from pydantic import BaseModel


class EmailVerificationResponse(BaseModel):
    """Response after successful email verification."""

    message: str
