"""Post schemas for request/response validation."""

from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field

from app.schemas.user import UserResponseSchema


class PostType(str, Enum):
    """Clothing type enumeration for API."""

    SHIRT = "SHIRT"
    PANTS = "PANTS"
    JACKET = "JACKET"
    SHOES = "SHOES"
    ACCESSORIES = "ACCESSORIES"
    OTHER = "OTHER"


class PostCreateSchema(BaseModel):
    """Schema for creating a new post."""

    title: str = Field(
        ...,
        min_length=1,
        max_length=200,
        description="Title of the clothing item",
    )
    description: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Detailed description of the item",
    )
    type: PostType = Field(
        ...,
        description="Category of the clothing item",
    )
    price: Decimal = Field(
        ...,
        gt=0,
        le=1000000,
        decimal_places=2,
        description="Price in the marketplace currency",
    )


class PostUpdateSchema(BaseModel):
    """Schema for updating a post."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1, max_length=5000)
    type: PostType | None = None
    price: Decimal | None = Field(None, gt=0, le=1000000, decimal_places=2)


class PostResponseSchema(BaseModel):
    """Schema for post response."""

    id: int
    title: str
    description: str
    type: PostType
    price: Decimal
    image_url: str | None
    image_urls: list[str] | None = None
    user: UserResponseSchema

    class Config:
        from_attributes = True
