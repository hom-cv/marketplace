"""Posts API endpoints for the marketplace."""

from decimal import Decimal
from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    bad_request_error,
    not_found_error,
)
from app.core.security import get_current_user
from app.crud.post import PostCRUD, get_post_crud
from app.db.utils import get_async_db
from app.models import Post, User
from app.models.post import PostType
from app.schemas.payment import PaymentMethodType, PriceBreakdownResponse
from app.schemas.post import PaginatedPostsResponse, PostResponseSchema
from app.schemas.post import PostType as PostTypeSchema
from app.services.listing_service import AnnotatedListingService
from app.services.pricing_service import AnnotatedPricingService
from app.services.storage_service import AnnotatedStorageService


AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PostResponseSchema,
)
async def create_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud_dep: AnnotatedPostCRUD,
    current_user: Annotated[User, Depends(get_current_user)],
    storage_service: AnnotatedStorageService,
    title: Annotated[str, Form(min_length=1, max_length=200)],
    description: Annotated[str, Form(min_length=1, max_length=5000)],
    type: Annotated[PostTypeSchema, Form()],
    price: Annotated[Decimal, Form(gt=0, le=1000000)],
    shipping_cost: Annotated[Decimal, Form(ge=0, le=10000)] = Decimal("0"),
    images: Annotated[list[UploadFile], File()] = [],
) -> PostResponseSchema:
    """
    Create a new post in the marketplace.

    Accepts multipart/form-data with optional multiple image uploads.
    The first image will be used as the cover/display image.
    Maximum 5 images allowed. Supported formats: jpg, jpeg, png, gif, webp.

    Requires the user to be a verified seller.
    """
    # Check if user is a verified seller
    if not current_user.is_seller:
        raise bad_request_error(
            "You must be a verified seller to create listings. "
            "Please complete seller verification first."
        )

    image_urls = await storage_service.upload_images(images, folder="posts")

    image_url = image_urls[0] if image_urls else None

    post = Post(
        title=title,
        description=description,
        type=PostType[type.value],
        price=price,
        shipping_cost=shipping_cost,
        image_url=image_url,
        image_urls=image_urls,
        user_id=current_user.id,
    )

    created_post = await post_crud_dep.create_post(db, post=post)
    return PostResponseSchema.model_validate(created_post)


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=PaginatedPostsResponse,
)
async def list_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud_dep: AnnotatedPostCRUD,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    types: Annotated[list[PostTypeSchema] | None, Query()] = None,
    min_price: Annotated[Decimal | None, Query(ge=0)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0)] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> PaginatedPostsResponse:
    """
    List all posts in the marketplace with filtering and pagination.

    Posts are sorted with non-sold items first, then sold items.
    Within each group, posts are sorted by newest first.

    Query parameters:
    - skip: Number of records to skip (for pagination)
    - limit: Maximum number of records to return
    - types: Filter by post types (can specify multiple)
    - min_price: Minimum price filter
    - max_price: Maximum price filter
    - search: Search query for title/description
    """
    # Convert schema types to model types for CRUD
    model_types = [PostType[t.value] for t in types] if types else None

    posts_with_sold, total = await post_crud_dep.get_posts_with_filters(
        db,
        skip=skip,
        limit=limit,
        types=model_types,
        min_price=min_price,
        max_price=max_price,
        search=search,
    )

    # Convert to response schema with is_sold
    items = []
    for post, is_sold in posts_with_sold:
        response_item = PostResponseSchema.model_validate(post)
        response_item.is_sold = is_sold
        items.append(response_item)

    return PaginatedPostsResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=list[PostResponseSchema],
)
async def get_my_posts(
    listing_service: AnnotatedListingService,
    current_user: Annotated[User, Depends(get_current_user)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PostResponseSchema]:
    """
    Get all posts created by the current user.

    Includes ban status for each post (optimized single query).
    """
    return await listing_service.get_my_listings(
        user_id=current_user.id, skip=skip, limit=limit
    )


@router.get(
    "/{post_id}",
    status_code=status.HTTP_200_OK,
    response_model=PostResponseSchema,
)
async def get_post(
    listing_service: AnnotatedListingService,
    post_id: int,
) -> PostResponseSchema:
    """
    Get a specific post by ID.

    Includes ban status for the post and user (optimized single query).
    """
    post = await listing_service.get_listing(post_id)

    if not post:
        raise not_found_error("Post not found")

    return post


@router.get(
    "/{post_id}/price-breakdown",
    status_code=status.HTTP_200_OK,
    response_model=PriceBreakdownResponse,
)
async def get_price_breakdown(
    pricing_service: AnnotatedPricingService,
    post_id: int,
    payment_method: Literal["card", "promptpay"] = Query(
        "card", description="Payment method"
    ),
) -> PriceBreakdownResponse:
    """
    Get price breakdown for a post.

    Returns the full price breakdown including item price, shipping,
    VAT, platform fee, processing fee, and total.
    """
    method = PaymentMethodType(payment_method)
    breakdown = await pricing_service.get_price_breakdown_for_post(post_id, method)

    return PriceBreakdownResponse.model_validate(breakdown)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud_dep: AnnotatedPostCRUD,
    current_user: Annotated[User, Depends(get_current_user)],
    post_id: int,
) -> None:
    """
    Delete a post (soft delete).

    Only the owner can delete their post. The post is soft-deleted
    to preserve payment records for accounting purposes.
    """
    post = await post_crud_dep.get_by_id_with_user(db, id=post_id)

    if not post:
        raise not_found_error("Post not found")

    if post.user_id != current_user.id:
        raise bad_request_error("You can only delete your own posts")

    await post_crud_dep.soft_delete(db, post=post)


@router.get(
    "/preview/earnings",
    status_code=status.HTTP_200_OK,
    response_model=PriceBreakdownResponse,
)
async def preview_earnings(
    pricing_service: AnnotatedPricingService,
    item_price: Annotated[
        Decimal, Query(gt=0, le=1000000, description="Item price in THB")
    ],
    shipping_cost: Annotated[
        Decimal, Query(ge=0, le=10000, description="Shipping cost in THB")
    ] = Decimal("0"),
    payment_method: Literal["card", "promptpay"] = Query(
        "card", description="Payment method"
    ),
) -> PriceBreakdownResponse:
    """
    Preview seller earnings for a given price and shipping cost.

    This endpoint calculates the price breakdown without requiring an existing post.
    Useful for showing earnings preview during post creation.
    """
    method = PaymentMethodType(payment_method)
    breakdown = pricing_service.calculate_order_total(item_price, shipping_cost, method)

    return PriceBreakdownResponse.model_validate(breakdown)
