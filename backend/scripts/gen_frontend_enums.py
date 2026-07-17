"""Generate the frontend's enum/size constants from the backend source of truth.

The enums + size lists in ``app/constants/post.py`` are authoritative; this writes
their frontend mirror so the two can't drift. Run before committing whenever those
change:

    pipenv run python scripts/gen_frontend_enums.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))  # put backend/ on path

from app.constants.post import (  # noqa: E402
    LETTER_SIZES,
    SHOE_SIZES,
    SUIT_SIZES,
    WAIST_SIZES,
    Gender,
    PostCategory,
    SizeGroup,
    Subcategory,
)

_OUT = Path(__file__).resolve().parents[2] / "frontend/src/api/types/generated.ts"


def _const(name: str, values: list[str]) -> str:
    items = "".join(f'  "{v}",\n' for v in values)
    return f"export const {name} = [\n{items}] as const;\n"


def _union(type_name: str, const_name: str) -> str:
    return f"export type {type_name} = (typeof {const_name})[number];\n"


def render() -> str:
    """The full generated.ts contents (also used by any drift check)."""
    return "".join(
        [
            "// AUTO-GENERATED from backend/app/constants/post.py — do not edit.\n",
            "// Regenerate: pipenv run python scripts/gen_frontend_enums.py\n\n",
            _const("POST_CATEGORIES", [c.value for c in PostCategory]),
            _union("PostCategory", "POST_CATEGORIES"),
            "\n",
            _const("POST_GENDERS", [g.value for g in Gender]),
            _union("Gender", "POST_GENDERS"),
            "\n",
            _const("SIZE_GROUPS", [s.value for s in SizeGroup]),
            _union("SizeGroup", "SIZE_GROUPS"),
            "\n",
            # Flat list of every subcategory code (for URL validation); the gendered
            # tree + labels are served separately via GET /categories.
            "// Flat list of every subcategory code (the gendered tree is served via\n"
            "// GET /categories); used to validate subcategory URL params.\n",
            _const("SUBCATEGORIES", [s.value for s in Subcategory]),
            _union("Subcategory", "SUBCATEGORIES"),
            "\n",
            _const("LETTER_SIZES", LETTER_SIZES),
            "\n",
            _const("WAIST_SIZES", WAIST_SIZES),
            "\n",
            _const("SUIT_SIZES", SUIT_SIZES),
            "\n",
            _const("SHOE_SIZES", SHOE_SIZES),
        ]
    )


if __name__ == "__main__":
    _OUT.write_text(render())
    print(f"wrote {_OUT}")
