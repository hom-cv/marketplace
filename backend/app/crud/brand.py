"""Brand CRUD operations."""

from typing import Annotated, Sequence

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.post import CATCHALL_BRAND_SLUG
from app.models.brand import Brand


class BrandCRUD:
    """CRUD operations for Brand model.

    Brands are a curated list (admin/seed-managed); sellers pick from it, they
    can't create new ones. Anything not in the list resolves to the catch-all.
    """

    async def list_brands(self, db: AsyncSession) -> Sequence[Brand]:
        """All brands, alphabetical (for the pick-list + the Explore filter)."""
        result = await db.scalars(select(Brand).order_by(Brand.name))
        return result.all()

    async def resolve_or_catchall(
        self, db: AsyncSession, *, slug: str | None
    ) -> Brand:
        """Return the curated brand for ``slug``, else the catch-all brand.

        A missing or unknown slug falls back to the seeded catch-all, so every
        listing ends up with a real brand (never a free-typed one).
        """
        if slug:
            brand = await db.scalar(select(Brand).where(Brand.slug == slug))
            if brand:
                return brand
        catchall = await db.scalar(
            select(Brand).where(Brand.slug == CATCHALL_BRAND_SLUG)
        )
        if catchall is None:
            raise RuntimeError(
                f"Catch-all brand '{CATCHALL_BRAND_SLUG}' is not seeded"
            )
        return catchall


brand_crud = BrandCRUD()


def get_brand_crud() -> BrandCRUD:
    """Dependency provider for BrandCRUD instance."""
    return brand_crud


AnnotatedBrandCRUD = Annotated[BrandCRUD, Depends(get_brand_crud)]
