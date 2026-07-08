"""Post/listing-related constants."""

from enum import Enum


class PostType(str, Enum):
    """Clothing type. Shared by the API schema and the ORM model."""

    SHIRT = "SHIRT"
    PANTS = "PANTS"
    JACKET = "JACKET"
    SHOES = "SHOES"
    ACCESSORIES = "ACCESSORIES"
    OTHER = "OTHER"


class Gender(str, Enum):
    """Target department. Shared by the API schema and the ORM model."""

    MENS = "MENS"
    WOMENS = "WOMENS"
    UNISEX = "UNISEX"


MIN_LISTING_PRICE: int = 50
MAX_LISTING_PRICE: int = 1_000_000

MIN_SHIPPING_COST: int = 0
MAX_SHIPPING_COST: int = 10_000

MAX_BRAND_NAME_LENGTH: int = 128
MAX_TAGS_PER_POST: int = 10
MAX_TAG_LENGTH: int = 50

# Catch-all brand for items whose brand isn't in the curated list. Seeded; a
# listing with no/unknown brand resolves to this.
CATCHALL_BRAND_SLUG: str = "other"
