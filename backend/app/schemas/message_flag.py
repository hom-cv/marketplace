"""Message flag schemas for response validation."""

from datetime import datetime

from pydantic import BaseModel


class MessageFlagResponse(BaseModel):
    """Schema for a single flagged message."""

    id: int
    message_id: int
    conversation_id: int
    sender_id: int
    sender_username: str
    message_content: str
    matched_patterns: list[str]
    status: str
    created_date: datetime
    reviewed_by_username: str | None = None
    reviewed_at: datetime | None = None


class MessageFlagListResponse(BaseModel):
    """Schema for paginated flagged message list."""

    items: list[MessageFlagResponse]
    total: int
    skip: int
    limit: int
