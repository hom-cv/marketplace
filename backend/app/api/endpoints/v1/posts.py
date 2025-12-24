"""Posts API endpoints for the marketplace."""

from decimal import Decimal
from typing import Annotated, Literal

from app.core.exceptions import (
    bad_request_error,
    not_found_error,
)
from app.core.security import get_current_user
from app.crud.post import post_crud
from app.db.utils import get_async_db
from app.models import Post, User
from app.models.post import PostType
from app.schemas.payment import PaymentMethodType, PriceBreakdownResponse
from app.schemas.post import PostResponseSchema
from app.schemas.post import PostType as PostTypeSchema
from app.services.pricing_service import AnnotatedPricingService
from app.services.storage_service import AnnotatedStorageService
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PostResponseSchema,
)
async def create_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
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

    created_post = await post_crud.create_post(db, post=post)

    return PostResponseSchema(
        **PostResponseSchema.model_validate(created_post).model_dump(exclude={"is_sold"}),
        is_sold=False,
    )


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

    posts_with_status = await post_crud.get_all_posts_with_sold_status(
        db, skip=skip, limit=limit
    )

    return [
        PostResponseSchema(
            **PostResponseSchema.model_validate(item.post).model_dump(exclude={"is_sold"}),
            is_sold=item.is_sold,
        )
        for item in posts_with_status
    ]


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

    Uses a single query with JOIN to get posts and sold status.
    """

    posts_with_status = await post_crud.get_by_user_id_with_sold_status(
        db, user_id=current_user.id, skip=skip, limit=limit
    )

    return [
        PostResponseSchema(
            **PostResponseSchema.model_validate(item.post).model_dump(exclude={"is_sold"}),
            is_sold=item.is_sold,
        )
        for item in posts_with_status
    ]


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
    result = await post_crud.get_by_id_with_sold_status(db, id=post_id)

    if not result:
        raise not_found_error("Post not found")

    return PostResponseSchema(
        **PostResponseSchema.model_validate(result.post).model_dump(exclude={"is_sold"}),
        is_sold=result.is_sold,
    )


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
    current_user: Annotated[User, Depends(get_current_user)],
    post_id: int,
) -> None:
    """
    Delete a post (soft delete).

    Only the owner can delete their post. The post is soft-deleted
    to preserve payment records for accounting purposes.
    """
    post = await post_crud.get_by_id_with_user(db, id=post_id)

    if not post:
        raise not_found_error("Post not found")

    if post.user_id != current_user.id:
        raise bad_request_error("You can only delete your own posts")

    await post_crud.soft_delete(db, post=post)


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
