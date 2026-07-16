"""Category taxonomy endpoint (public, static).

Serves the single source-of-truth taxonomy so the frontend never re-declares it.
"""

from fastapi import APIRouter, status

from app.constants.taxonomy import taxonomy_payload

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("", status_code=status.HTTP_200_OK)
def get_categories() -> dict:
    """Return the gendered category tree + per-subcategory size groups.

    Static and cacheable — drives the create form, explore filters, and the
    Shop By Category menu on the frontend.
    """
    return taxonomy_payload()
