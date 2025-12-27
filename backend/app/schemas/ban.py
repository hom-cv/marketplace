"""Ban schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class BanUserRequest(BaseModel):
    """Schema for banning a user."""

    user_id: int = Field(..., description="ID of the user to ban")
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Reason for banning the user",
    )


class BanPostRequest(BaseModel):
    """Schema for banning a post/listing."""

    post_id: int = Field(..., description="ID of the post to ban")
    reason: str = Field(
        ...,
        min_length=5,
        max_length=500,
        description="Reason for banning the post",
    )


class UserBanResponse(BaseModel):
    """Schema for user ban response."""

    id: int
    user_id: int
    username: str
    reason: str
    is_active: bool
    created_date: datetime
    banned_by_username: str
    lifted_at: datetime | None = None
    lifted_by_username: str | None = None

    model_config = {"from_attributes": True}


class PostBanResponse(BaseModel):
    """Schema for post ban response."""

    id: int
    post_id: int
    post_title: str
    seller_username: str
    reason: str
    is_active: bool
    created_date: datetime
    banned_by_username: str
    lifted_at: datetime | None = None
    lifted_by_username: str | None = None

    model_config = {"from_attributes": True}


class UserBanListResponse(BaseModel):
    """Schema for paginated user ban list response."""

    items: list[UserBanResponse]
    total: int
    skip: int
    limit: int


class PostBanListResponse(BaseModel):
    """Schema for paginated post ban list response."""

    items: list[PostBanResponse]
    total: int
    skip: int
    limit: int
