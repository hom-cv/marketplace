"""Posts API endpoints for the marketplace."""

from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error, server_error
from app.core.security import get_current_user
from app.crud.post import post_crud
from app.db.utils import get_async_db
from app.models import Post, User
from app.models.post import PostType
from app.schemas.post import PostResponseSchema
from app.schemas.post import PostType as PostTypeSchema
from app.services.storage import storage_service

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PostResponseSchema,
)
async def create_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    title: Annotated[str, Form(min_length=1, max_length=200)],
    description: Annotated[str, Form(min_length=1, max_length=5000)],
    type: Annotated[PostTypeSchema, Form()],
    price: Annotated[Decimal, Form(gt=0, le=1000000)],
    images: Annotated[list[UploadFile], File()] = [],
) -> PostResponseSchema:
    """
    Create a new post in the marketplace.

    Accepts multipart/form-data with optional multiple image uploads.
    The first image will be used as the cover/display image.
    """
    try:
        image_urls = await storage_service.upload_images(images, folder="posts")
    except Exception:
        raise server_error("Failed to upload images. Please try again.")

    image_url = image_urls[0] if image_urls else None

    post = Post(
        title=title,
        description=description,
        type=PostType[type.value],
        price=price,
        image_url=image_url,
        image_urls=image_urls,
        user_id=current_user.id,
    )

    created_post = await post_crud.create_post(db, post=post)
    return PostResponseSchema.model_validate(created_post)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=list[PostResponseSchema],
)
async def list_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PostResponseSchema]:
    """
    List all posts in the marketplace.

    Supports pagination with skip and limit parameters.
    """
    posts = await post_crud.get_all_posts(db, skip=skip, limit=limit)
    return [PostResponseSchema.model_validate(p) for p in posts]


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=list[PostResponseSchema],
)
async def get_my_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PostResponseSchema]:
    """
    Get all posts created by the current user.
    """
    posts = await post_crud.get_by_user_id(
        db, user_id=current_user.id, skip=skip, limit=limit
    )
    return [PostResponseSchema.model_validate(p) for p in posts]


@router.get(
    "/{post_id}",
    status_code=status.HTTP_200_OK,
    response_model=PostResponseSchema,
)
async def get_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_id: int,
) -> PostResponseSchema:
    """
    Get a specific post by ID.
    """
    post = await post_crud.get_by_id_with_user(db, id=post_id)

    if not post:
        raise not_found_error("Post not found")

    return PostResponseSchema.model_validate(post)
