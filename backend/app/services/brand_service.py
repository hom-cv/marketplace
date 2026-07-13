"""Brand catalog service (admin add/remove). Owns commits; CRUD flushes."""

import logging
from typing import Annotated

from fastapi import Depends
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.post import RESERVED_BRAND_SLUG
from app.core.exceptions import (
    bad_request_error,
    conflict_error,
    not_found_error,
)
from app.core.utils import slugify
from app.crud.brand import BrandCRUD, get_brand_crud
from app.db.utils import get_async_db
from app.schemas.post import BrandRead

logger = logging.getLogger(__name__)


class BrandService:
    """Manage the curated brand list (admin only)."""

    def __init__(self, db: AsyncSession, brand_crud_dep: BrandCRUD) -> None:
        self.db = db
        self._brand_crud = brand_crud_dep

    async def list_brands(self) -> list[BrandRead]:
        """All selectable brands, alphabetical."""
        brands = await self._brand_crud.list_brands(self.db)
        return [BrandRead.model_validate(b) for b in brands]

    async def create_brand(self, *, name: str) -> BrandRead:
        """Create a brand; slug is derived from ``name`` and must be unique."""
        name = name.strip()
        slug = slugify(name)
        if not slug:
            raise bad_request_error("Brand name must contain a letter or number")
        if slug == RESERVED_BRAND_SLUG:
            raise bad_request_error(f"'{name}' is a reserved brand name")
        if await self._brand_crud.get_by_slug(self.db, slug):
            raise conflict_error(f"Brand '{name}' already exists")

        brand = await self._brand_crud.create(self.db, name=name, slug=slug)
        try:
            await self.db.commit()
        except IntegrityError:
            await self.db.rollback()

            raise conflict_error(f"Brand '{name}' already exists")
        logger.info("Created brand %r", slug)
        return BrandRead.model_validate(brand)

    async def delete_brand(self, *, slug: str) -> None:
        """Delete a brand by slug. Its posts fall back to "Other" (NULL brand)
        via the FK's ``ON DELETE SET NULL``."""
        brand = await self._brand_crud.get_by_slug(self.db, slug)
        if brand is None:
            raise not_found_error(f"Brand '{slug}' not found")

        await self._brand_crud.delete(self.db, brand=brand)
        await self.db.commit()
        logger.info("Deleted brand %r", slug)


def _get_brand_service(
    brand_crud_dep: Annotated[BrandCRUD, Depends(get_brand_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> BrandService:
    """Factory function to create BrandService instance."""
    return BrandService(db, brand_crud_dep)


AnnotatedBrandService = Annotated[BrandService, Depends(_get_brand_service)]
