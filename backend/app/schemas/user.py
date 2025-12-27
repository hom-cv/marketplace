"""User schemas for request/response validation."""

from typing import Any

from pydantic import BaseModel, EmailStr, Field


class UserCreateSchema(BaseModel):
    """Schema for creating a new user."""

    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Unique username (alphanumeric and underscores only)",
    )
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: str = Field(..., min_length=1, max_length=64)
    email_address: EmailStr = Field(..., description="Unique email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (minimum 8 characters)",
    )


class UserUpdateSchema(BaseModel):
    """Schema for updating a user."""

    username: str | None = Field(
        None,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_]+$",
    )
    first_name: str | None = Field(None, min_length=1, max_length=64)
    last_name: str | None = Field(None, min_length=1, max_length=64)
    email_address: EmailStr | None = None


class UserResponseSchema(BaseModel):
    """Schema for user response (without sensitive data)."""

    id: int
    username: str
    first_name: str
    last_name: str
    email_address: str
    email_verified: bool
    is_seller: bool = False
    seller_status: str | None = None
    is_admin: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(cls, user: Any) -> "UserResponseSchema":
        """Create response from User model with seller info."""
        seller_status = None
        if user.seller_profile:
            seller_status = user.seller_profile.verification_status.value.lower()

        return cls(
            id=user.id,
            username=user.username,
            first_name=user.first_name,
            last_name=user.last_name,
            email_address=user.email_address,
            email_verified=user.email_verified,
            is_seller=user.is_seller,
            seller_status=seller_status,
            is_admin=user.is_admin,
        )
