"""Feedback schemas for request/response validation."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field


class FeedbackCreateSchema(BaseModel):
    """Schema for leaving feedback on a purchase."""

    payment_id: int
    rating: int = Field(..., ge=1, le=5)
    comment: str | None = Field(None, max_length=500)


class FeedbackResponseSchema(BaseModel):
    """Schema for a feedback item in responses."""

    id: int
    rating: int
    comment: str | None = None
    created_at: datetime
    reviewer_username: str

    @classmethod
    def from_feedback(cls, feedback: Any) -> "FeedbackResponseSchema":
        """Build from a Feedback model with its reviewer relationship loaded."""
        return cls(
            id=feedback.id,
            rating=feedback.rating,
            comment=feedback.comment,
            created_at=feedback.created_date,
            reviewer_username=feedback.reviewer.username,
        )
