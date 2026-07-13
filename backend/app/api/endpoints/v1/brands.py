"""Brand endpoints (public list; admin add/remove)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import AnnotatedAdminUser
from app.crud.brand import AnnotatedBrandCRUD
from app.db.utils import get_async_db
from app.schemas.post import BrandCreateRequest, BrandRead
from app.services.brand_service import AnnotatedBrandService

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", status_code=status.HTTP_200_OK, response_model=list[BrandRead])
async def list_brands(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    brand_crud_dep: AnnotatedBrandCRUD,
) -> list[BrandRead]:
    """List all brands (alphabetical) for autocomplete and Explore filtering."""
    brands = await brand_crud_dep.list_brands(db)
    return [BrandRead.model_validate(b) for b in brands]


@router.post("", status_code=status.HTTP_201_CREATED, response_model=BrandRead)
async def create_brand(
    admin_user: AnnotatedAdminUser,
    brand_service: AnnotatedBrandService,
    request: BrandCreateRequest,
) -> BrandRead:
    """Create a brand. **Admin only.** Slug is derived from the name."""
    return await brand_service.create_brand(name=request.name)


@router.delete("/{slug}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_brand(
    admin_user: AnnotatedAdminUser,
    brand_service: AnnotatedBrandService,
    slug: str,
) -> None:
    """Delete a brand by slug. **Admin only.** The catch-all is protected."""
    await brand_service.delete_brand(slug=slug)
