"""Like schemas for request/response validation."""

from pydantic import BaseModel

from app.schemas.post import PostResponseSchema


class LikedPostsResponse(BaseModel):
    """Paginated response for user's liked posts."""

    items: list[PostResponseSchema]
    total: int
    skip: int
    limit: int
