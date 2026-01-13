"""Post schemas for request/response validation."""

from decimal import Decimal
from enum import Enum
from typing import Any

from app.schemas.user import UserResponseSchema
from pydantic import BaseModel, Field, ValidationError, model_validator


class PostType(str, Enum):
    """Clothing type enumeration for API."""

    SHIRT = "SHIRT"
    PANTS = "PANTS"
    JACKET = "JACKET"
    SHOES = "SHOES"
    ACCESSORIES = "ACCESSORIES"
    OTHER = "OTHER"


class LetterSize(str, Enum):
    """Letter-based clothing sizes for shirts, jackets, and tops."""

    XS = "XS"
    S = "S"
    M = "M"
    L = "L"
    XL = "XL"
    XXL = "XXL"
    XXXL = "XXXL"
    ONE_SIZE = "ONE_SIZE"


# Measurement schemas for category-specific validation
class TopMeasurements(BaseModel):
    """Measurements for shirts, jackets, and tops (all in cm)."""

    shoulder: float | None = Field(None, ge=0, le=200, description="Shoulder width")
    length: float | None = Field(None, ge=0, le=200, description="Total length")
    bust: float | None = Field(None, ge=0, le=200, description="Bust/chest width")
    sleeve: float | None = Field(None, ge=0, le=200, description="Sleeve length")


class PantsMeasurements(BaseModel):
    """Measurements for pants (all in cm)."""

    total_length: float | None = Field(None, ge=0, le=200, description="Total length")
    inseam: float | None = Field(None, ge=0, le=200, description="Inseam length")
    rise: float | None = Field(None, ge=0, le=100, description="Rise length")
    hip: float | None = Field(None, ge=0, le=200, description="Hip width")


class ShoesMeasurements(BaseModel):
    """Measurements for shoes (in cm)."""

    insole_length: float | None = Field(None, ge=0, le=50, description="Insole length")


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
    
    Raises:
        ValueError: If measurements are invalid for the given post type.
    """
    if measurements is None:
        return

    if post_type in (PostType.SHIRT, PostType.JACKET, PostType.OTHER):
        _validate_nested_measurements(measurements, TopMeasurements, post_type.value)
    elif post_type == PostType.PANTS:
        _validate_nested_measurements(measurements, PantsMeasurements, post_type.value)
    elif post_type == PostType.SHOES:
        _validate_nested_measurements(measurements, ShoesMeasurements, post_type.value)
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
        gt=0,
        le=1000000,
        decimal_places=2,
        description="Price in the marketplace currency",
    )
    shipping_cost: Decimal = Field(
        default=Decimal("0"),
        ge=0,
        le=10000,
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
    price: Decimal | None = Field(None, gt=0, le=1000000, decimal_places=2)
    shipping_cost: Decimal | None = Field(None, ge=0, le=10000, decimal_places=2)
    size: str | None = Field(None, min_length=1, max_length=20)
    measurements: dict[str, Any] | None = None


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

    class Config:
        from_attributes = True


class PaginatedPostsResponse(BaseModel):
    """Paginated posts response with total count."""

    items: list[PostResponseSchema]
    total: int
    skip: int
    limit: int
