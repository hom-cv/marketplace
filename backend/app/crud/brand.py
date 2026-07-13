"""Brand CRUD operations."""

from typing import Annotated, Sequence

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import slugify
from app.models.brand import Brand


class BrandCRUD:
    """CRUD operations for Brand model.

    Brands are a curated list (admin/seed-managed); sellers pick from it, they
    can't create new ones. Anything not in the list is treated as "Other"
    (a NULL brand on the post).
    """

    async def list_brands(self, db: AsyncSession) -> Sequence[Brand]:
        """Selectable brands, alphabetical (for the pick-list + Explore filter)."""
        result = await db.scalars(
            select(Brand).order_by(func.lower(Brand.name))
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

        Its posts fall back to "Other" via the FK's ``ON DELETE SET NULL``.
        """
        await db.delete(brand)
        await db.flush()

    async def resolve(
        self, db: AsyncSession, *, slug: str | None
    ) -> Brand | None:
        """Return the curated brand for ``slug``, or ``None`` when it's
        unspecified or unknown (a NULL brand means "Other")."""
        normalized = slugify(slug) if slug else ""
        if not normalized:
            return None
        return await self.get_by_slug(db, normalized)


brand_crud = BrandCRUD()


def get_brand_crud() -> BrandCRUD:
    """Dependency provider for BrandCRUD instance."""
    return brand_crud


AnnotatedBrandCRUD = Annotated[BrandCRUD, Depends(get_brand_crud)]
