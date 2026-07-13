"""Brand endpoints (public list; admin add/remove)."""

from fastapi import APIRouter, status

from app.core.security import AnnotatedAdminUser
from app.schemas.post import BrandCreateRequest, BrandRead
from app.services.brand_service import AnnotatedBrandService

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", status_code=status.HTTP_200_OK, response_model=list[BrandRead])
async def list_brands(
    brand_service: AnnotatedBrandService,
) -> list[BrandRead]:
    """List all brands (alphabetical) for autocomplete and Explore filtering."""
    return await brand_service.list_brands()


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
    """Delete a brand by slug. **Admin only.** Its posts fall back to "Other"."""
    await brand_service.delete_brand(slug=slug)
