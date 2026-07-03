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
