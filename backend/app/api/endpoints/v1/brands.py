"""Brand endpoints (public list for autocomplete + Explore filter)."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.brand import AnnotatedBrandCRUD
from app.db.utils import get_async_db
from app.schemas.post import BrandRead

router = APIRouter(prefix="/brands", tags=["brands"])


@router.get("", status_code=status.HTTP_200_OK, response_model=list[BrandRead])
async def list_brands(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    brand_crud_dep: AnnotatedBrandCRUD,
) -> list[BrandRead]:
    """List all brands (alphabetical) for autocomplete and Explore filtering."""
    brands = await brand_crud_dep.list_brands(db)
    return [BrandRead.model_validate(b) for b in brands]
