"""Invite schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class InviteCreateRequest(BaseModel):
    """Schema for creating invite codes."""

    count: int = Field(
        default=1,
        ge=1,
        le=50,
        description="Number of invite codes to generate (1-50)",
    )


class InviteResponse(BaseModel):
    """Schema for invite code response."""

    code: str
    status: str
    created_at: datetime
    used_at: datetime | None = None
    created_by_username: str | None = None
    used_by_username: str | None = None

    model_config = {"from_attributes": True}


class InviteListResponse(BaseModel):
    """Schema for paginated invite list response."""

    items: list[InviteResponse]
    total: int
    skip: int
    limit: int
