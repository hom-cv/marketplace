"""User schemas for request/response validation."""

from typing import Any

from pydantic import BaseModel, EmailStr, Field, field_validator


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
    last_name: str = Field("", max_length=64)
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
    bio: str | None = None
    show_full_name: bool = True

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
            bio=user.bio,
            show_full_name=user.show_full_name,
        )


class UserListResponse(BaseModel):
    """Schema for the admin user list response."""

    items: list[UserResponseSchema]
    total: int


class UserProfileUpdateSchema(BaseModel):
    """The full set of editable profile fields, submitted on every save.

    This is a full replacement: send the current value for any field that is
    not changing. Per-field null handling mirrors the database columns:
    ``username``/``first_name``/``show_full_name`` are required and non-nullable
    (null or omitted -> 422), ``last_name`` is required but a null clears it
    (stored as ""), and ``bio`` is nullable so a null clears it.
    """

    model_config = {"str_strip_whitespace": True}

    username: str = Field(
        ...,
        min_length=3,
        max_length=64,
        pattern=r"^[a-zA-Z0-9_]+$",
        description="Unique username (alphanumeric and underscores only)",
    )
    first_name: str = Field(..., min_length=1, max_length=64)
    last_name: str | None = Field(..., max_length=64)
    bio: str | None = Field(..., max_length=500, description="User bio")
    show_full_name: bool = Field(
        ..., description="Whether to show full name on profile"
    )

    @field_validator("last_name")
    @classmethod
    def _normalize_last_name(cls, value: str | None) -> str:
        """A null last name clears the field; stored as "" (column is NOT NULL)."""
        return "" if value is None else value


class PublicUserProfileSchema(BaseModel):
    """Schema for public user profile response."""

    id: int
    username: str
    first_name: str | None = None
    last_name: str | None = None
    bio: str | None = None
    is_seller: bool = False
    total_likes: int = 0
    follower_count: int = 0
    completed_sales: int = 0
    rating: float | None = None
    feedback_count: int = 0
    is_followed: bool = False

    model_config = {"from_attributes": True}

    @classmethod
    def from_user(
        cls,
        user: Any,
        total_likes: int,
        follower_count: int = 0,
        completed_sales: int = 0,
        rating: float | None = None,
        feedback_count: int = 0,
        is_followed: bool = False,
    ) -> "PublicUserProfileSchema":
        """Create public profile from User model."""
        return cls(
            id=user.id,
            username=user.username,
            first_name=user.first_name if user.show_full_name else None,
            last_name=user.last_name if user.show_full_name else None,
            bio=user.bio,
            is_seller=user.is_seller,
            total_likes=total_likes,
            follower_count=follower_count,
            completed_sales=completed_sales,
            rating=rating,
            feedback_count=feedback_count,
            is_followed=is_followed,
        )
