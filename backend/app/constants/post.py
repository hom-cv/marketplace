"""Post/listing vocabulary enums + scalar constants.
"""

from enum import Enum

# SYNC: PostCategory / SizeGroup mirror POST_CATEGORIES / SIZE_GROUPS in
# frontend/src/api/types/post.ts. The category tree is served via /categories
# (taxonomy.py), so it is not duplicated.


class PostCategory(str, Enum):
    """Top-level clothing category. Shared by the API schema and the ORM model."""

    TOPS = "TOPS"
    BOTTOMS = "BOTTOMS"
    OUTERWEAR = "OUTERWEAR"
    FOOTWEAR = "FOOTWEAR"
    ACCESSORIES = "ACCESSORIES"
    TAILORING = "TAILORING"
    DRESSES = "DRESSES"
    JEWELRY = "JEWELRY"
    BAGS = "BAGS"


class Gender(str, Enum):
    """Target department. Shared by the API schema and the ORM model."""

    MENS = "MENS"
    WOMENS = "WOMENS"
    UNISEX = "UNISEX"


class SizeGroup(str, Enum):
    """Which size options + measurement fields a subcategory shows."""

    LETTER = "LETTER"  # XS-XXXL
    WAIST = "WAIST"  # 26-44
    SHOE = "SHOE"  # EU 35-48
    SUIT = "SUIT"  # 34-50 (chest)
    ONE_SIZE = "ONE_SIZE"  # no size


MIN_LISTING_PRICE: int = 50
MAX_LISTING_PRICE: int = 1_000_000

MIN_SHIPPING_COST: int = 0
MAX_SHIPPING_COST: int = 10_000

MAX_BRAND_NAME_LENGTH: int = 128
MAX_TAGS_PER_POST: int = 10
MAX_TAG_LENGTH: int = 50

RESERVED_BRAND_SLUG: str = "other"
