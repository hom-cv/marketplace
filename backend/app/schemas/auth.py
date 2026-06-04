from typing import Annotated

from pydantic import BaseModel, EmailStr, Field, StringConstraints


class AuthLoginSchema(BaseModel):
    """Schema for user login."""

    email_address: str
    password: str


class AuthLoginResponse(BaseModel):
    """Schema for login response with access token."""

    access_token: str
    token_type: str


class AuthRegisterSchema(BaseModel):
    """Schema for user registration.

    The name/username fields are whitespace-trimmed (common with mobile
    autocomplete). The password is intentionally left untouched — we never
    alter what the user typed, and login does not strip either.
    """

    username: Annotated[
        str,
        StringConstraints(
            strip_whitespace=True,
            to_lower=True,
            min_length=3,
            max_length=64,
            pattern=r"^[a-zA-Z0-9_]+$",
        ),
    ] = Field(..., description="Unique username (alphanumeric and underscores only)")
    first_name: Annotated[
        str, StringConstraints(strip_whitespace=True, min_length=1, max_length=64)
    ]
    last_name: Annotated[
        str, StringConstraints(strip_whitespace=True, max_length=64)
    ] = ""
    email_address: EmailStr = Field(..., description="Unique email address")
    password: str = Field(
        ...,
        min_length=8,
        max_length=128,
        description="Password (minimum 8 characters)",
    )


class AuthRegisterResponse(BaseModel):
    """Schema for registration response."""

    id: int
    username: str
    first_name: str
    last_name: str
    email_address: str

    class Config:
        from_attributes = True
