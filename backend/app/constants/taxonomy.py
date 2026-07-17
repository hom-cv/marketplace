"""The category taxonomy: the gendered category tree + per-subcategory sizing.

Single source of truth for categories — validated against here and served to the
frontend via ``taxonomy_payload`` (GET /categories).
"""

from functools import lru_cache

from app.constants.post import (
    Gender,
    PostCategory,
    SizeGroup,
    Subcategory,
)

# Display label per top category.
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

# gender -> category -> ordered subcategories

_MENS_TREE: dict[PostCategory, list[Subcategory]] = {
    PostCategory.TOPS: [
        Subcategory.LONG_SLEEVE_T_SHIRTS,
        Subcategory.POLOS,
        Subcategory.SHIRTS_BUTTON_UPS,
        Subcategory.SHORT_SLEEVE_T_SHIRTS,
        Subcategory.SWEATERS_AND_KNITWEAR,
        Subcategory.SWEATSHIRTS_AND_HOODIES,
        Subcategory.TANK_TOPS_AND_SLEEVELESS,
        Subcategory.JERSEYS,
    ],
    PostCategory.BOTTOMS: [
        Subcategory.CASUAL_PANTS,
        Subcategory.CROPPED_PANTS,
        Subcategory.DENIM,
        Subcategory.LEGGINGS,
        Subcategory.OVERALLS_AND_JUMPSUITS,
        Subcategory.SHORTS,
        Subcategory.SWEATPANTS_AND_JOGGERS,
        Subcategory.SWIMWEAR,
    ],
    PostCategory.OUTERWEAR: [
        Subcategory.BOMBERS,
        Subcategory.CLOAKS_AND_CAPES,
        Subcategory.DENIM_JACKETS,
        Subcategory.HEAVY_COATS,
        Subcategory.LEATHER_JACKETS,
        Subcategory.LIGHT_JACKETS,
        Subcategory.PARKAS,
        Subcategory.RAINCOATS,
        Subcategory.VESTS,
    ],
    PostCategory.FOOTWEAR: [
        Subcategory.BOOTS,
        Subcategory.CASUAL_LEATHER_SHOES,
        Subcategory.FORMAL_SHOES,
        Subcategory.HI_TOP_SNEAKERS,
        Subcategory.LOW_TOP_SNEAKERS,
        Subcategory.SANDALS,
        Subcategory.SLIP_ONS,
    ],
    PostCategory.ACCESSORIES: [
        Subcategory.BAGS_AND_LUGGAGE,
        Subcategory.BELTS,
        Subcategory.GLASSES,
        Subcategory.GLOVES_AND_SCARVES,
        Subcategory.HATS,
        Subcategory.JEWELRY_AND_WATCHES,
        Subcategory.WALLETS,
        Subcategory.MISCELLANEOUS,
        Subcategory.SOCKS_AND_UNDERWEAR,
        Subcategory.SUNGLASSES,
        Subcategory.TIES_AND_POCKETSQUARES,
    ],
    PostCategory.TAILORING: [
        Subcategory.BLAZERS,
        Subcategory.FORMAL_SHIRTING,
        Subcategory.FORMAL_TROUSERS,
        Subcategory.SUITS,
        Subcategory.TUXEDOS,
        Subcategory.VESTS,
    ],
}

_WOMENS_TREE: dict[PostCategory, list[Subcategory]] = {
    PostCategory.TOPS: [
        Subcategory.BLOUSES,
        Subcategory.BODYSUITS,
        Subcategory.BUTTON_UPS,
        Subcategory.CROP_TOPS,
        Subcategory.HOODIES,
        Subcategory.LONG_SLEEVE_T_SHIRTS,
        Subcategory.POLOS,
        Subcategory.SHORT_SLEEVE_T_SHIRTS,
        Subcategory.SWEATERS,
        Subcategory.SWEATSHIRTS,
        Subcategory.TANK_TOPS,
    ],
    PostCategory.BOTTOMS: [
        Subcategory.JEANS,
        Subcategory.JUMPSUITS,
        Subcategory.LEGGINGS,
        Subcategory.MAXI_SKIRTS,
        Subcategory.MIDI_SKIRTS,
        Subcategory.MINI_SKIRTS,
        Subcategory.PANTS,
        Subcategory.SHORTS,
    ],
    PostCategory.DRESSES: [
        Subcategory.MINI_DRESSES,
        Subcategory.MIDI_DRESSES,
        Subcategory.MAXI_DRESSES,
        Subcategory.GOWNS,
    ],
    PostCategory.OUTERWEAR: [
        Subcategory.BLAZERS,
        Subcategory.BOMBERS,
        Subcategory.COATS,
        Subcategory.DENIM_JACKETS,
        Subcategory.DOWN_JACKETS,
        Subcategory.FUR_AND_FAUX_FUR,
        Subcategory.JACKETS,
        Subcategory.LEATHER_JACKETS,
        Subcategory.RAIN_JACKETS,
        Subcategory.VESTS,
    ],
    PostCategory.FOOTWEAR: [
        Subcategory.BOOTS,
        Subcategory.HEELS,
        Subcategory.PLATFORMS,
        Subcategory.MULES,
        Subcategory.FLATS,
        Subcategory.HI_TOP_SNEAKERS,
        Subcategory.LOW_TOP_SNEAKERS,
        Subcategory.SANDALS,
        Subcategory.SLIP_ONS,
    ],
    PostCategory.JEWELRY: [
        Subcategory.BRACELETS,
        Subcategory.EARRINGS,
        Subcategory.NECKLACES,
        Subcategory.RINGS,
    ],
    PostCategory.ACCESSORIES: [
        Subcategory.BELTS,
        Subcategory.GLASSES,
        Subcategory.GLOVES,
        Subcategory.HAIR_ACCESSORIES,
        Subcategory.HATS,
        Subcategory.MISCELLANEOUS,
        Subcategory.SCARVES,
        Subcategory.SOCKS_AND_INTIMATES,
        Subcategory.SUNGLASSES,
        Subcategory.WALLETS,
        Subcategory.WATCHES,
    ],
    PostCategory.BAGS: [
        Subcategory.BACKPACKS,
        Subcategory.BELT_BAGS,
        Subcategory.BUCKET_BAGS,
        Subcategory.CLUTCHES,
        Subcategory.CROSSBODY_BAGS,
        Subcategory.HANDLE_BAGS,
        Subcategory.HOBO_BAGS,
        Subcategory.LUGGAGE_AND_TRAVEL,
        Subcategory.MESSENGERS_AND_SATCHELS,
        Subcategory.MINI_BAGS,
        Subcategory.SHOULDER_BAGS,
        Subcategory.TOTE_BAGS,
        Subcategory.OTHER,
    ],
}


def _union_tree(
    *trees: dict[PostCategory, list[Subcategory]],
) -> dict[PostCategory, list[Subcategory]]:
    """Merge trees, deduping leaves per category while preserving first-seen order."""
    merged: dict[PostCategory, list[Subcategory]] = {}
    for tree in trees:
        for category, leaves in tree.items():
            existing = merged.setdefault(category, [])
            for leaf in leaves:
                if leaf not in existing:
                    existing.append(leaf)
    return merged


# gender -> category -> subcategories (unisex = union of both).
CATEGORY_TREE: dict[Gender, dict[PostCategory, list[Subcategory]]] = {
    Gender.MENS: _MENS_TREE,
    Gender.WOMENS: _WOMENS_TREE,
    Gender.UNISEX: _union_tree(_MENS_TREE, _WOMENS_TREE),
}

# Size group per category, overridable per subcategory below.
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

SUBCATEGORY_SIZE_GROUP: dict[Subcategory, SizeGroup] = {
    Subcategory.DENIM: SizeGroup.WAIST,
    Subcategory.JEANS: SizeGroup.WAIST,
    Subcategory.CASUAL_PANTS: SizeGroup.WAIST,
    Subcategory.CROPPED_PANTS: SizeGroup.WAIST,
    Subcategory.PANTS: SizeGroup.WAIST,
    Subcategory.FORMAL_TROUSERS: SizeGroup.WAIST,
    Subcategory.FORMAL_SHIRTING: SizeGroup.LETTER,
    Subcategory.BELTS: SizeGroup.WAIST,
    Subcategory.GLOVES_AND_SCARVES: SizeGroup.LETTER,
    Subcategory.GLOVES: SizeGroup.LETTER,
    Subcategory.HATS: SizeGroup.LETTER,
    Subcategory.SOCKS_AND_UNDERWEAR: SizeGroup.LETTER,
    Subcategory.SOCKS_AND_INTIMATES: SizeGroup.LETTER,
}

# Display label per subcategory code.
SUBCATEGORY_LABELS: dict[Subcategory, str] = {
    Subcategory.BACKPACKS: "Backpacks",
    Subcategory.BAGS_AND_LUGGAGE: "Bags & Luggage",
    Subcategory.BELTS: "Belts",
    Subcategory.BELT_BAGS: "Belt Bags",
    Subcategory.BLAZERS: "Blazers",
    Subcategory.BLOUSES: "Blouses",
    Subcategory.BODYSUITS: "Bodysuits",
    Subcategory.BOMBERS: "Bombers",
    Subcategory.BOOTS: "Boots",
    Subcategory.BRACELETS: "Bracelets",
    Subcategory.BUCKET_BAGS: "Bucket Bags",
    Subcategory.BUTTON_UPS: "Button Ups",
    Subcategory.CASUAL_LEATHER_SHOES: "Casual Leather Shoes",
    Subcategory.CASUAL_PANTS: "Casual Pants",
    Subcategory.CLOAKS_AND_CAPES: "Cloaks & Capes",
    Subcategory.CLUTCHES: "Clutches",
    Subcategory.COATS: "Coats",
    Subcategory.CROPPED_PANTS: "Cropped Pants",
    Subcategory.CROP_TOPS: "Crop Tops",
    Subcategory.CROSSBODY_BAGS: "Crossbody Bags",
    Subcategory.DENIM: "Denim",
    Subcategory.DENIM_JACKETS: "Denim Jackets",
    Subcategory.DOWN_JACKETS: "Down Jackets",
    Subcategory.EARRINGS: "Earrings",
    Subcategory.FLATS: "Flats",
    Subcategory.FORMAL_SHIRTING: "Formal Shirting",
    Subcategory.FORMAL_SHOES: "Formal Shoes",
    Subcategory.FORMAL_TROUSERS: "Formal Trousers",
    Subcategory.FUR_AND_FAUX_FUR: "Fur & Faux Fur",
    Subcategory.GLASSES: "Glasses",
    Subcategory.GLOVES: "Gloves",
    Subcategory.GLOVES_AND_SCARVES: "Gloves & Scarves",
    Subcategory.GOWNS: "Gowns",
    Subcategory.HAIR_ACCESSORIES: "Hair Accessories",
    Subcategory.HANDLE_BAGS: "Handle Bags",
    Subcategory.HATS: "Hats",
    Subcategory.HEAVY_COATS: "Heavy Coats",
    Subcategory.HEELS: "Heels",
    Subcategory.HI_TOP_SNEAKERS: "Hi-Top Sneakers",
    Subcategory.HOBO_BAGS: "Hobo Bags",
    Subcategory.HOODIES: "Hoodies",
    Subcategory.JACKETS: "Jackets",
    Subcategory.JEANS: "Jeans",
    Subcategory.JERSEYS: "Jerseys",
    Subcategory.JEWELRY_AND_WATCHES: "Jewelry & Watches",
    Subcategory.JUMPSUITS: "Jumpsuits",
    Subcategory.LEATHER_JACKETS: "Leather Jackets",
    Subcategory.LEGGINGS: "Leggings",
    Subcategory.LIGHT_JACKETS: "Light Jackets",
    Subcategory.LONG_SLEEVE_T_SHIRTS: "Long Sleeve T-Shirts",
    Subcategory.LOW_TOP_SNEAKERS: "Low-Top Sneakers",
    Subcategory.LUGGAGE_AND_TRAVEL: "Luggage & Travel",
    Subcategory.MAXI_DRESSES: "Maxi Dresses",
    Subcategory.MAXI_SKIRTS: "Maxi Skirts",
    Subcategory.MESSENGERS_AND_SATCHELS: "Messengers & Satchels",
    Subcategory.MIDI_DRESSES: "Midi Dresses",
    Subcategory.MIDI_SKIRTS: "Midi Skirts",
    Subcategory.MINI_BAGS: "Mini Bags",
    Subcategory.MINI_DRESSES: "Mini Dresses",
    Subcategory.MINI_SKIRTS: "Mini Skirts",
    Subcategory.MISCELLANEOUS: "Miscellaneous",
    Subcategory.MULES: "Mules",
    Subcategory.NECKLACES: "Necklaces",
    Subcategory.OTHER: "Other",
    Subcategory.OVERALLS_AND_JUMPSUITS: "Overalls & Jumpsuits",
    Subcategory.PANTS: "Pants",
    Subcategory.PARKAS: "Parkas",
    Subcategory.PLATFORMS: "Platforms",
    Subcategory.POLOS: "Polos",
    Subcategory.RAINCOATS: "Raincoats",
    Subcategory.RAIN_JACKETS: "Rain Jackets",
    Subcategory.RINGS: "Rings",
    Subcategory.SANDALS: "Sandals",
    Subcategory.SCARVES: "Scarves",
    Subcategory.SHIRTS_BUTTON_UPS: "Shirts (Button Ups)",
    Subcategory.SHORTS: "Shorts",
    Subcategory.SHORT_SLEEVE_T_SHIRTS: "Short Sleeve T-Shirts",
    Subcategory.SHOULDER_BAGS: "Shoulder Bags",
    Subcategory.SLIP_ONS: "Slip Ons",
    Subcategory.SOCKS_AND_INTIMATES: "Socks & Intimates",
    Subcategory.SOCKS_AND_UNDERWEAR: "Socks & Underwear",
    Subcategory.SUITS: "Suits",
    Subcategory.SUNGLASSES: "Sunglasses",
    Subcategory.SWEATERS: "Sweaters",
    Subcategory.SWEATERS_AND_KNITWEAR: "Sweaters & Knitwear",
    Subcategory.SWEATPANTS_AND_JOGGERS: "Sweatpants & Joggers",
    Subcategory.SWEATSHIRTS: "Sweatshirts",
    Subcategory.SWEATSHIRTS_AND_HOODIES: "Sweatshirts & Hoodies",
    Subcategory.SWIMWEAR: "Swimwear",
    Subcategory.TANK_TOPS: "Tank Tops",
    Subcategory.TANK_TOPS_AND_SLEEVELESS: "Tank Tops & Sleeveless",
    Subcategory.TIES_AND_POCKETSQUARES: "Ties & Pocketsquares",
    Subcategory.TOTE_BAGS: "Tote Bags",
    Subcategory.TUXEDOS: "Tuxedos",
    Subcategory.VESTS: "Vests",
    Subcategory.WALLETS: "Wallets",
    Subcategory.WATCHES: "Watches",
}


def size_group_for(
    category: PostCategory, subcategory: Subcategory | None
) -> SizeGroup:
    """SizeGroup for a (category, subcategory): leaf override, else category default.

    ``subcategory`` may be None (legacy posts predate the taxonomy) — that falls
    through to the category default.
    """
    if subcategory is None:
        return CATEGORY_DEFAULT_SIZE_GROUP[category]
    return SUBCATEGORY_SIZE_GROUP.get(
        subcategory, CATEGORY_DEFAULT_SIZE_GROUP[category]
    )


def is_valid_category_path(
    gender: Gender, category: PostCategory, subcategory: Subcategory
) -> bool:
    """Whether (gender, category, subcategory) is a real path in the taxonomy."""
    return subcategory in CATEGORY_TREE.get(gender, {}).get(category, [])


@lru_cache(maxsize=1)
def taxonomy_payload() -> dict:
    """Serialize the taxonomy for the public GET /categories endpoint.

    Cached: the taxonomy is static, so the dict is built once and reused. Callers
    (the endpoint) only read it, never mutate.

    Shape: ``{genders, categoryLabels, subcategoryLabels, categoryDefaultSizeGroups,
    subcategorySizeGroups}``. The frontend computes a subcategory's size group as
    ``subcategorySizeGroups[leaf] ?? categoryDefaultSizeGroups[category]``.
    """
    return {
        "genders": {
            gender.value: {
                cat.value: [s.value for s in leaves]
                for cat, leaves in tree.items()
            }
            for gender, tree in CATEGORY_TREE.items()
        },
        "categoryLabels": {cat.value: label for cat, label in CATEGORY_LABELS.items()},
        "subcategoryLabels": {
            code.value: label for code, label in SUBCATEGORY_LABELS.items()
        },
        "categoryDefaultSizeGroups": {
            cat.value: group.value
            for cat, group in CATEGORY_DEFAULT_SIZE_GROUP.items()
        },
        "subcategorySizeGroups": {
            code.value: group.value for code, group in SUBCATEGORY_SIZE_GROUP.items()
        },
    }
