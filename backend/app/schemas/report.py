"""Report schemas for request/response validation."""

from datetime import datetime

from pydantic import BaseModel, Field


class ReportCreateRequest(BaseModel):
    """Schema for creating a report."""

    report_type: str = Field(
        ...,
        pattern="^(user|post)$",
        description="Type of report: 'user' or 'post'",
    )
    reported_user_id: int | None = Field(
        default=None,
        description="ID of the user being reported (required if report_type is 'user')",
    )
    reported_post_id: int | None = Field(
        default=None,
        description="ID of the post being reported (required if report_type is 'post')",
    )
    reason: str = Field(
        ...,
        pattern="^(counterfeit|abuse_of_system|prohibited_item|scam)$",
        description="Reason: counterfeit, abuse_of_system, prohibited_item, scam",
    )
    description: str = Field(
        ...,
        min_length=10,
        max_length=1000,
        description="Detailed description of the issue",
    )


class ReportResponse(BaseModel):
    """Schema for report response."""

    id: int
    report_type: str
    reason: str
    description: str
    status: str
    created_at: datetime
    # Reporter info (only for admins)
    reporter_username: str | None = None
    # Reported entity info
    reported_user_id: int | None = None
    reported_username: str | None = None
    reported_post_id: int | None = None
    reported_post_title: str | None = None
    # Review info
    reviewed_by_username: str | None = None
    reviewed_at: datetime | None = None
    admin_notes: str | None = None

    model_config = {"from_attributes": True}


class ReportReviewRequest(BaseModel):
    """Schema for reviewing/updating a report."""

    status: str = Field(
        ...,
        pattern="^(reviewed|resolved|dismissed)$",
        description="New status: reviewed, resolved, or dismissed",
    )
    admin_notes: str | None = Field(
        default=None,
        max_length=1000,
        description="Admin notes about the review decision",
    )


class ReportListResponse(BaseModel):
    """Schema for paginated report list response."""

    items: list[ReportResponse]
    total: int
    skip: int
    limit: int
