"""Post/listing-related constants, including the category taxonomy.

The taxonomy is the single source of truth for categories: the backend validates
against it and serves it (``taxonomy_payload``) so the frontend never re-declares it.
"""

from enum import Enum


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


# Human-readable label per top category (used by the frontend menu/filters directly).
CATEGORY_LABELS: dict[PostCategory, str] = {
    PostCategory.TOPS: "Tops",
    PostCategory.BOTTOMS: "Bottoms",
    PostCategory.OUTERWEAR: "Outerwear",
    PostCategory.FOOTWEAR: "Footwear",
    PostCategory.ACCESSORIES: "Accessories",
    PostCategory.TAILORING: "Tailoring",
    PostCategory.DRESSES: "Dresses",
    PostCategory.JEWELRY: "Jewelry",
    PostCategory.BAGS: "Bags & Luggage",
}

# --- The taxonomy: gender -> category -> ordered granular subcategories ---------
# Leaf strings are the canonical subcategory values (stored + validated verbatim).

_MENS_TREE: dict[PostCategory, list[str]] = {
    PostCategory.TOPS: [
        "Long Sleeve T-Shirts",
        "Polos",
        "Shirts (Button Ups)",
        "Short Sleeve T-Shirts",
        "Sweaters & Knitwear",
        "Sweatshirts & Hoodies",
        "Tank Tops & Sleeveless",
        "Jerseys",
    ],
    PostCategory.BOTTOMS: [
        "Casual Pants",
        "Cropped Pants",
        "Denim",
        "Leggings",
        "Overalls & Jumpsuits",
        "Shorts",
        "Sweatpants & Joggers",
        "Swimwear",
    ],
    PostCategory.OUTERWEAR: [
        "Bombers",
        "Cloaks & Capes",
        "Denim Jackets",
        "Heavy Coats",
        "Leather Jackets",
        "Light Jackets",
        "Parkas",
        "Raincoats",
        "Vests",
    ],
    PostCategory.FOOTWEAR: [
        "Boots",
        "Casual Leather Shoes",
        "Formal Shoes",
        "Hi-Top Sneakers",
        "Low-Top Sneakers",
        "Sandals",
        "Slip Ons",
    ],
    PostCategory.ACCESSORIES: [
        "Bags & Luggage",
        "Belts",
        "Glasses",
        "Gloves & Scarves",
        "Hats",
        "Jewelry & Watches",
        "Wallets",
        "Miscellaneous",
        "Socks & Underwear",
        "Sunglasses",
        "Ties & Pocketsquares",
    ],
    PostCategory.TAILORING: [
        "Blazers",
        "Formal Shirting",
        "Formal Trousers",
        "Suits",
        "Tuxedos",
        "Vests",
    ],
}

_WOMENS_TREE: dict[PostCategory, list[str]] = {
    PostCategory.TOPS: [
        "Blouses",
        "Bodysuits",
        "Button Ups",
        "Crop Tops",
        "Hoodies",
        "Long Sleeve T-Shirts",
        "Polos",
        "Short Sleeve T-Shirts",
        "Sweaters",
        "Sweatshirts",
        "Tank Tops",
    ],
    PostCategory.BOTTOMS: [
        "Jeans",
        "Jumpsuits",
        "Leggings",
        "Maxi Skirts",
        "Midi Skirts",
        "Mini Skirts",
        "Pants",
        "Shorts",
    ],
    PostCategory.DRESSES: [
        "Mini Dresses",
        "Midi Dresses",
        "Maxi Dresses",
        "Gowns",
    ],
    PostCategory.OUTERWEAR: [
        "Blazers",
        "Bombers",
        "Coats",
        "Denim Jackets",
        "Down Jackets",
        "Fur & Faux Fur",
        "Jackets",
        "Leather Jackets",
        "Rain Jackets",
        "Vests",
    ],
    PostCategory.FOOTWEAR: [
        "Boots",
        "Heels",
        "Platforms",
        "Mules",
        "Flats",
        "Hi-Top Sneakers",
        "Low-Top Sneakers",
        "Sandals",
        "Slip Ons",
    ],
    PostCategory.JEWELRY: [
        "Bracelets",
        "Earrings",
        "Necklaces",
        "Rings",
    ],
    PostCategory.ACCESSORIES: [
        "Belts",
        "Glasses",
        "Gloves",
        "Hair Accessories",
        "Hats",
        "Miscellaneous",
        "Scarves",
        "Socks & Intimates",
        "Sunglasses",
        "Wallets",
        "Watches",
    ],
    PostCategory.BAGS: [
        "Backpacks",
        "Belt Bags",
        "Bucket Bags",
        "Clutches",
        "Crossbody Bags",
        "Handle Bags",
        "Hobo Bags",
        "Luggage & Travel",
        "Messengers & Satchels",
        "Mini Bags",
        "Shoulder Bags",
        "Tote Bags",
        "Other",
    ],
}


def _union_tree(
    *trees: dict[PostCategory, list[str]],
) -> dict[PostCategory, list[str]]:
    """Merge trees, deduping leaves per category while preserving first-seen order."""
    merged: dict[PostCategory, list[str]] = {}
    for tree in trees:
        for category, leaves in tree.items():
            existing = merged.setdefault(category, [])
            for leaf in leaves:
                if leaf not in existing:
                    existing.append(leaf)
    return merged


# Unisex draws from the union of both trees (deduped).
_UNISEX_TREE = _union_tree(_MENS_TREE, _WOMENS_TREE)

CATEGORY_TREE: dict[Gender, dict[PostCategory, list[str]]] = {
    Gender.MENS: _MENS_TREE,
    Gender.WOMENS: _WOMENS_TREE,
    Gender.UNISEX: _UNISEX_TREE,
}

# --- Sizing: which SizeGroup a listing uses -----------------------------------
# Group is looked up per-subcategory (override) falling back to the category default,
# because top categories are heterogeneous (Tailoring = blazers letter + trousers waist).

CATEGORY_DEFAULT_SIZE_GROUP: dict[PostCategory, SizeGroup] = {
    PostCategory.TOPS: SizeGroup.LETTER,
    PostCategory.BOTTOMS: SizeGroup.LETTER,
    PostCategory.OUTERWEAR: SizeGroup.LETTER,
    PostCategory.FOOTWEAR: SizeGroup.SHOE,
    PostCategory.ACCESSORIES: SizeGroup.ONE_SIZE,
    PostCategory.TAILORING: SizeGroup.SUIT,
    PostCategory.DRESSES: SizeGroup.LETTER,
    PostCategory.JEWELRY: SizeGroup.ONE_SIZE,
    PostCategory.BAGS: SizeGroup.ONE_SIZE,
}

# Leaf-level overrides. Keyed by subcategory string (no cross-category conflicts today;
# if two categories ever need the same leaf in different groups, switch to a (cat, leaf) key).
SUBCATEGORY_SIZE_GROUP: dict[str, SizeGroup] = {
    # waist-sized bottoms/trousers
    "Denim": SizeGroup.WAIST,
    "Jeans": SizeGroup.WAIST,
    "Casual Pants": SizeGroup.WAIST,
    "Cropped Pants": SizeGroup.WAIST,
    "Pants": SizeGroup.WAIST,
    # tailoring: trousers use waist, dress shirts use letter; the rest default to suit
    "Formal Trousers": SizeGroup.WAIST,
    "Formal Shirting": SizeGroup.LETTER,
    # letter-sized accessories that actually have sizes
    "Belts": SizeGroup.LETTER,
    "Gloves & Scarves": SizeGroup.LETTER,
    "Gloves": SizeGroup.LETTER,
    "Hats": SizeGroup.LETTER,
    "Socks & Underwear": SizeGroup.LETTER,
    "Socks & Intimates": SizeGroup.LETTER,
}


def size_group_for(category: PostCategory, subcategory: str | None) -> SizeGroup:
    """SizeGroup for a (category, subcategory): leaf override, else category default.

    ``subcategory`` may be None (legacy posts predate the taxonomy) — that falls
    through to the category default.
    """
    if subcategory is None:
        return CATEGORY_DEFAULT_SIZE_GROUP[category]
    return SUBCATEGORY_SIZE_GROUP.get(subcategory) or CATEGORY_DEFAULT_SIZE_GROUP[
        category
    ]


def is_valid_category_path(
    gender: Gender, category: PostCategory, subcategory: str
) -> bool:
    """Whether (gender, category, subcategory) is a real path in the taxonomy."""
    return subcategory in CATEGORY_TREE.get(gender, {}).get(category, [])


def taxonomy_payload() -> dict:
    """Serialize the taxonomy for the public GET /categories endpoint.

    Shape: ``{genders, categoryLabels, categoryDefaultSizeGroups, subcategorySizeGroups}``.
    The frontend computes a subcategory's size group as
    ``subcategorySizeGroups[leaf] ?? categoryDefaultSizeGroups[category]``.
    """
    return {
        "genders": {
            gender.value: {cat.value: leaves for cat, leaves in tree.items()}
            for gender, tree in CATEGORY_TREE.items()
        },
        "categoryLabels": {cat.value: label for cat, label in CATEGORY_LABELS.items()},
        "categoryDefaultSizeGroups": {
            cat.value: group.value
            for cat, group in CATEGORY_DEFAULT_SIZE_GROUP.items()
        },
        "subcategorySizeGroups": {
            leaf: group.value for leaf, group in SUBCATEGORY_SIZE_GROUP.items()
        },
    }


MIN_LISTING_PRICE: int = 50
MAX_LISTING_PRICE: int = 1_000_000

MIN_SHIPPING_COST: int = 0
MAX_SHIPPING_COST: int = 10_000

MAX_BRAND_NAME_LENGTH: int = 128
MAX_TAGS_PER_POST: int = 10
MAX_TAG_LENGTH: int = 50

RESERVED_BRAND_SLUG: str = "other"
