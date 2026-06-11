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
    fee_free_sales: int = Field(
        default=0,
        ge=0,
        le=100,
        description="Number of platform-fee-free sales each code grants (0-100)",
    )


class InviteResponse(BaseModel):
    """Schema for invite code response."""

    code: str
    status: str
    fee_free_sales: int = 0
    created_date: datetime
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
