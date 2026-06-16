"""Post schemas for request/response validation."""

from decimal import Decimal
from enum import Enum
from typing import Any

from pydantic import BaseModel, Field, ValidationError, model_validator

from app.constants.post import (
    MAX_LISTING_PRICE,
    MAX_SHIPPING_COST,
    MIN_LISTING_PRICE,
    MIN_SHIPPING_COST,
)
from app.constants.storage import MAX_IMAGES_PER_POST
from app.schemas.user import UserResponseSchema


class PostType(str, Enum):
    """Clothing type enumeration for API."""

    SHIRT = "SHIRT"
    PANTS = "PANTS"
    JACKET = "JACKET"
    SHOES = "SHOES"
    ACCESSORIES = "ACCESSORIES"
    OTHER = "OTHER"


# Measurement schemas for category-specific validation
class TopMeasurements(BaseModel):
    """Measurements for shirts, jackets, and tops (all in cm)."""

    shoulder: float | None = Field(None, ge=0, description="Shoulder width")
    length: float | None = Field(None, ge=0, description="Total length")
    bust: float | None = Field(None, ge=0, description="Bust/chest width")
    sleeve: float | None = Field(None, ge=0, description="Sleeve length")


class PantsMeasurements(BaseModel):
    """Measurements for pants (all in cm)."""

    total_length: float | None = Field(None, ge=0, description="Total length")
    inseam: float | None = Field(None, ge=0, description="Inseam length")
    rise: float | None = Field(None, ge=0, description="Rise length")
    hip: float | None = Field(None, ge=0, description="Hip width")


class ShoesMeasurements(BaseModel):
    """Measurements for shoes (in cm)."""

    insole_length: float | None = Field(None, ge=0, description="Insole length")


def _validate_nested_measurements(
    measurements: dict[str, Any], model_cls: type[BaseModel], type_name: str
) -> None:
    """Validate measurements against a specific model, converting ValidationError to ValueError."""
    try:
        model_cls(**measurements)
    except ValidationError as e:
        errors = e.errors()
        error_messages = [
            f"{'.'.join(str(loc) for loc in err['loc'])}: {err['msg']}"
            for err in errors
        ]
        raise ValueError(
            f"Invalid measurements for {type_name}: {'; '.join(error_messages)}"
        )


def validate_measurements_for_post_type(
    post_type: "PostType", measurements: dict[str, Any] | None
) -> None:
    """
    Validate measurements structure based on post type.

    This function can be called directly from endpoints without
    needing to instantiate the full PostCreateSchema.

    Validation rules:
    - SHIRT, JACKET: Validates against TopMeasurements schema
    - PANTS: Validates against PantsMeasurements schema
    - SHOES: Validates against ShoesMeasurements schema
    - OTHER: No schema validation - allows any custom measurements
    - ACCESSORIES: Measurements not supported

    Raises:
        ValueError: If measurements are invalid for the given post type.
    """
    if measurements is None:
        return

    if post_type in (PostType.SHIRT, PostType.JACKET):
        _validate_nested_measurements(measurements, TopMeasurements, post_type.value)
    elif post_type == PostType.PANTS:
        _validate_nested_measurements(measurements, PantsMeasurements, post_type.value)
    elif post_type == PostType.SHOES:
        _validate_nested_measurements(measurements, ShoesMeasurements, post_type.value)
    # OTHER: No schema validation - users add custom measurements as needed
    elif post_type == PostType.ACCESSORIES and measurements:
        raise ValueError("Measurements are not supported for ACCESSORIES type.")


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
        ge=MIN_LISTING_PRICE,
        le=MAX_LISTING_PRICE,
        decimal_places=2,
        description=f"Price in THB (minimum ฿{MIN_LISTING_PRICE})",
    )
    shipping_cost: Decimal = Field(
        default=Decimal("0"),
        ge=MIN_SHIPPING_COST,
        le=MAX_SHIPPING_COST,
        decimal_places=2,
        description="Shipping cost set by seller",
    )
    size: str = Field(
        ...,
        min_length=1,
        max_length=20,
        description="Size of the item (letter or numeric)",
    )
    measurements: dict[str, Any] | None = Field(
        default=None,
        description="Optional measurements in cm",
    )
    image_urls: list[str] = Field(
        default_factory=list,
        max_length=MAX_IMAGES_PER_POST,
        description=(
            "Public CDN URLs of images already uploaded via presigned URLs. "
            "The first URL becomes the cover image."
        ),
    )

    @model_validator(mode="after")
    def validate_measurements_for_type(self) -> "PostCreateSchema":
        """Validate measurements structure based on post type."""
        validate_measurements_for_post_type(self.type, self.measurements)
        return self


class PostUpdateSchema(BaseModel):
    """Schema for updating a post."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1, max_length=5000)
    type: PostType | None = None
    price: Decimal | None = Field(
        None, ge=MIN_LISTING_PRICE, le=MAX_LISTING_PRICE, decimal_places=2
    )
    shipping_cost: Decimal | None = Field(
        None, ge=MIN_SHIPPING_COST, le=MAX_SHIPPING_COST, decimal_places=2
    )
    size: str | None = Field(None, min_length=1, max_length=20)
    measurements: dict[str, Any] | None = None


class PostUpdateRequest(BaseModel):
    """
    Schema for a full listing update (JSON body, PUT).

    Images are uploaded separately via presigned URLs; ``image_urls`` is the
    final ordered set of public CDN URLs (first = cover). Adding, removing, and
    reordering images is expressed entirely by this list.
    """

    title: str = Field(..., min_length=1, max_length=200)
    description: str = Field(..., min_length=1, max_length=5000)
    type: PostType
    price: Decimal = Field(
        ..., ge=MIN_LISTING_PRICE, le=MAX_LISTING_PRICE, decimal_places=2
    )
    shipping_cost: Decimal = Field(
        default=Decimal("0"),
        ge=MIN_SHIPPING_COST,
        le=MAX_SHIPPING_COST,
        decimal_places=2,
    )
    size: str = Field(..., min_length=1, max_length=20)
    measurements: dict[str, Any] | None = Field(
        default=None, description="Optional measurements in cm"
    )
    image_urls: list[str] = Field(
        default_factory=list,
        max_length=MAX_IMAGES_PER_POST,
        description=(
            "Final ordered list of public CDN image URLs (first = cover). "
            "Uploaded beforehand via presigned URLs."
        ),
    )

    @model_validator(mode="after")
    def validate_measurements_for_type(self) -> "PostUpdateRequest":
        """Validate measurements structure based on post type."""
        validate_measurements_for_post_type(self.type, self.measurements)
        return self


class PresignUploadRequest(BaseModel):
    """Request a presigned URL for a direct image upload to object storage."""

    content_type: str = Field(
        ..., description="Image MIME type, e.g. 'image/jpeg'"
    )


class PresignUploadResponse(BaseModel):
    """Presigned upload target plus the resulting public URL."""

    upload_url: str = Field(..., description="Signed PUT URL to upload the bytes to")
    file_url: str = Field(..., description="Public CDN URL to reference once uploaded")


class PostResponseSchema(BaseModel):
    """Schema for post response."""

    id: int
    title: str
    description: str
    type: PostType
    price: Decimal
    shipping_cost: Decimal
    image_url: str | None
    image_urls: list[str] | None = None
    size: str | None = None
    measurements: dict[str, Any] | None = None
    user: UserResponseSchema
    is_sold: bool = False
    is_banned: bool = False
    is_user_banned: bool = False
    is_reserved: bool = False
    is_reserved_by_viewer: bool = False
    like_count: int = 0
    is_liked: bool = False

    model_config = {"from_attributes": True}


class PaginatedPostsResponse(BaseModel):
    """Paginated posts response with total count."""

    items: list[PostResponseSchema]
    total: int
    skip: int
    limit: int
