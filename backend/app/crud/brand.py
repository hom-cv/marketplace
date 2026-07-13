"""Brand CRUD operations."""

from typing import Annotated, Sequence

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.post import CATCHALL_BRAND_SLUG
from app.core.utils import slugify
from app.models.brand import Brand


class BrandCRUD:
    """CRUD operations for Brand model.

    Brands are a curated list (admin/seed-managed); sellers pick from it, they
    can't create new ones. Anything not in the list resolves to the catch-all.
    """

    async def list_brands(self, db: AsyncSession) -> Sequence[Brand]:
        """Selectable brands, alphabetical (for the pick-list + Explore filter).

        Excludes the catch-all: it's a fallback, not a brand to advertise, and
        the create form pins its own relabeled "Other" option separately.
        """
        result = await db.scalars(
            select(Brand)
            .where(Brand.slug != CATCHALL_BRAND_SLUG)
            .order_by(Brand.name)
        )
        return result.all()

    async def get_by_slug(self, db: AsyncSession, slug: str) -> Brand | None:
        """Fetch a brand by its unique slug, or ``None``."""
        return await db.scalar(select(Brand).where(Brand.slug == slug))

    async def create(self, db: AsyncSession, *, name: str, slug: str) -> Brand:
        """Insert a brand (flush only; caller commits)."""
        brand = Brand(name=name, slug=slug)
        db.add(brand)
        await db.flush()
        return brand

    async def delete(self, db: AsyncSession, *, brand: Brand) -> None:
        """Delete a brand (flush only; caller commits).

        Posts referencing it are unlinked via the FK's ``ON DELETE SET NULL``.
        """
        await db.delete(brand)
        await db.flush()

    async def resolve_or_catchall(
        self, db: AsyncSession, *, slug: str | None
    ) -> Brand:
        """Return the curated brand for ``slug``, else the catch-all brand.
        """
        normalized = slugify(slug) if slug else ""

        if normalized:
            brand = await db.scalar(
                select(Brand).where(Brand.slug == normalized)
            )
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
