"""Post schemas for request/response validation."""

from decimal import Decimal
from typing import Annotated, Any

from pydantic import (
    AfterValidator,
    BaseModel,
    Field,
    ValidationError,
    field_validator,
    model_validator,
)

from app.constants.post import (
    MAX_BRAND_NAME_LENGTH,
    MAX_LISTING_PRICE,
    MAX_SHIPPING_COST,
    MAX_TAG_LENGTH,
    MAX_TAGS_PER_POST,
    MIN_LISTING_PRICE,
    MIN_SHIPPING_COST,
    Gender,
    PostCategory,
    SizeGroup,
)
from app.constants.storage import MAX_IMAGES_PER_POST
from app.constants.taxonomy import is_valid_category_path, size_group_for
from app.schemas.user import UserResponseSchema


class BrandRead(BaseModel):
    """Brand as exposed on a post response."""

    name: str
    slug: str

    model_config = {"from_attributes": True}


class BrandCreateRequest(BaseModel):
    """Admin: create a brand from a display name (slug derived server-side)."""

    name: str = Field(..., min_length=1, max_length=MAX_BRAND_NAME_LENGTH)


def validate_tags(tags: list[str]) -> list[str]:
    """Enforce tag count/length caps (normalization happens in the CRUD)."""
    if len(tags) > MAX_TAGS_PER_POST:
        raise ValueError(f"At most {MAX_TAGS_PER_POST} tags allowed")
    for tag in tags:
        if len(tag) > MAX_TAG_LENGTH:
            raise ValueError(f"Each tag must be at most {MAX_TAG_LENGTH} characters")
    return tags


TagList = Annotated[list[str], AfterValidator(validate_tags)]


# Measurement schemas for category-specific validation.
# SYNC: fields mirror MEASUREMENT_FIELDS_BY_GROUP in frontend/src/api/types/post.ts.
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


def validate_category_path(
    gender: "Gender", category: "PostCategory", subcategory: str | None
) -> None:
    """Ensure (gender, category, subcategory) is a real path in the taxonomy.

    Rejects off-tree leaves and gender-mismatched categories (e.g. MENS + DRESSES).
    """
    if subcategory is None:
        return
    if not is_valid_category_path(gender, category, subcategory):
        raise ValueError(
            f"'{subcategory}' is not a valid subcategory of "
            f"{category.value} for {gender.value}"
        )


def validate_measurements_for_category(
    category: "PostCategory",
    subcategory: str | None,
    measurements: dict[str, Any] | None,
) -> None:
    """
    Validate measurements structure based on the (category, subcategory) size group.

    - LETTER (tops/outerwear/dresses/most tailoring): TopMeasurements
    - WAIST (denim/trousers): PantsMeasurements
    - SHOE (footwear): ShoesMeasurements
    - ONE_SIZE (accessories/jewelry/bags): measurements not supported

    Raises:
        ValueError: If measurements are invalid for the resolved size group.
    """
    if measurements is None:
        return

    group = size_group_for(category, subcategory)
    if group in (SizeGroup.LETTER, SizeGroup.SUIT):
        _validate_nested_measurements(measurements, TopMeasurements, category.value)
    elif group == SizeGroup.WAIST:
        _validate_nested_measurements(measurements, PantsMeasurements, category.value)
    elif group == SizeGroup.SHOE:
        _validate_nested_measurements(measurements, ShoesMeasurements, category.value)
    elif group == SizeGroup.ONE_SIZE and measurements:
        raise ValueError(f"Measurements are not supported for {category.value}.")


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
    category: PostCategory = Field(
        ...,
        description="Top-level category of the clothing item",
    )
    subcategory: str = Field(
        ...,
        min_length=1,
        max_length=64,
        description="Granular subcategory (a leaf in the taxonomy for this gender+category)",
    )
    gender: Gender = Field(
        ...,
        description="Target department (mens/womens/unisex)",
    )
    brand: str | None = Field(
        default=None,
        max_length=MAX_BRAND_NAME_LENGTH,
        description="Brand slug from the curated list; unknown/blank → Other (no brand)",
    )
    tags: TagList = Field(
        default_factory=list,
        description="Hashtags (without '#'); normalized + deduped server-side",
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
    def validate_category_and_measurements(self) -> "PostCreateSchema":
        """Validate the taxonomy path, then measurements against its size group."""
        validate_category_path(self.gender, self.category, self.subcategory)
        validate_measurements_for_category(
            self.category, self.subcategory, self.measurements
        )
        return self


class PostUpdateSchema(BaseModel):
    """Schema for updating a post."""

    title: str | None = Field(None, min_length=1, max_length=200)
    description: str | None = Field(None, min_length=1, max_length=5000)
    category: PostCategory | None = None
    subcategory: str | None = Field(None, min_length=1, max_length=64)
    gender: Gender | None = None
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
    category: PostCategory
    subcategory: str = Field(..., min_length=1, max_length=64)
    gender: Gender
    brand: str | None = Field(default=None, max_length=MAX_BRAND_NAME_LENGTH)
    tags: TagList = Field(default_factory=list)
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
    def validate_category_and_measurements(self) -> "PostUpdateRequest":
        """Validate the taxonomy path, then measurements against its size group."""
        validate_category_path(self.gender, self.category, self.subcategory)
        validate_measurements_for_category(
            self.category, self.subcategory, self.measurements
        )
        return self


class PresignUploadRequest(BaseModel):
    """Request a presigned URL for a direct image upload to object storage."""

    content_type: str = Field(
        ..., description="Image MIME type, e.g. 'image/jpeg'"
    )


class PresignUploadResponse(BaseModel):
    """Presigned POST target plus the resulting public URL."""

    url: str = Field(..., description="URL to POST the multipart upload form to")
    fields: dict[str, str] = Field(
        ..., description="Form fields to include in the multipart POST (before the file)"
    )
    file_url: str = Field(..., description="Public CDN URL to reference once uploaded")


class PostResponseSchema(BaseModel):
    """Schema for post response."""

    id: int
    title: str
    description: str
    category: PostCategory
    subcategory: str | None = None
    size_group: SizeGroup | None = None
    gender: Gender
    brand: BrandRead | None = None
    tags: list[str] = Field(default_factory=list)
    price: Decimal
    shipping_cost: Decimal
    image_url: str | None
    image_urls: list[str] | None = None
    size: str | None = None
    measurements: dict[str, Any] | None = None
    user: UserResponseSchema

    @field_validator("tags", mode="before")
    @classmethod
    def _tag_names(cls, v: Any) -> list[str]:
        """Map the ORM ``list[Tag]`` to plain names (leave a list[str] as-is)."""
        if not v:
            return []

        return [getattr(t, "name", t) for t in v]

    @model_validator(mode="after")
    def _derive_size_group(self) -> "PostResponseSchema":
        """Compute the size group from (category, subcategory) for the client."""
        self.size_group = size_group_for(self.category, self.subcategory)

        return self

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
