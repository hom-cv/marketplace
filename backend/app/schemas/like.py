"""Like schemas for request/response validation."""

from pydantic import BaseModel

from app.schemas.post import PostResponseSchema


class LikeStatusResponse(BaseModel):
    """Response for like/unlike operations."""

    liked: bool
    like_count: int


class LikedPostsResponse(BaseModel):
    """Paginated response for user's liked posts."""

    items: list[PostResponseSchema]
    total: int
    skip: int
    limit: int
