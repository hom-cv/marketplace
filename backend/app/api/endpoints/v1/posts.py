"""Posts API endpoints for the marketplace."""

from decimal import Decimal
from typing import Annotated, Literal, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.payment import PaymentMethod
from app.constants.post import (
    MAX_LISTING_PRICE,
    MAX_SHIPPING_COST,
    MIN_LISTING_PRICE,
    MIN_SHIPPING_COST,
)
from app.core.exceptions import (
    bad_request_error,
    not_found_error,
)
from app.core.security import get_current_user, get_current_user_optional
from app.crud.like import AnnotatedLikeCRUD
from app.crud.post import AnnotatedPostCRUD
from app.db.utils import get_async_db
from app.models import User
from app.models.post import Gender, PostCategory
from app.schemas.payment import PriceBreakdownResponse
from app.schemas.post import (
    PaginatedPostsResponse,
    PostCreateSchema,
    PostResponseSchema,
    PostUpdateRequest,
    PresignUploadRequest,
    PresignUploadResponse,
)
from app.services.listing_service import AnnotatedListingService
from app.services.pricing_service import AnnotatedPricingService
from app.services.storage_service import AnnotatedStorageService

router = APIRouter(prefix="/posts", tags=["posts"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=PostResponseSchema,
)
async def create_post(
    listing_service: AnnotatedListingService,
    current_user: Annotated[User, Depends(get_current_user)],
    data: PostCreateSchema,
) -> PostResponseSchema:
    """
    Create a new listing in the marketplace.

    Images are uploaded separately via presigned URLs
    (POST /posts/uploads/presign); pass the resulting public CDN URLs in
    `image_urls` (first = cover, max 10).

    Category + subcategory are required and must be a valid path in the taxonomy
    (GET /categories) for the chosen gender. Size is required; valid sizes depend
    on the subcategory's size group:
    - LETTER (tops/outerwear/dresses/tailoring): XS, S, M, L, XL, XXL, XXXL
    - WAIST (denim/trousers): 26-44
    - SHOE (footwear): 35-48 (EU sizing)
    - ONE_SIZE (accessories/jewelry/bags): ONE_SIZE

    `measurements` is an optional object validated against the size group.

    Requires the user to be a verified seller.
    """
    if not current_user.is_seller:
        raise bad_request_error(
            "You must be a verified seller to create listings. "
            "Please complete seller verification first."
        )

    return await listing_service.create_listing(owner_id=current_user.id, data=data)


@router.post(
    "/uploads/presign",
    status_code=status.HTTP_200_OK,
    response_model=PresignUploadResponse,
)
async def create_upload_url(
    storage_service: AnnotatedStorageService,
    current_user: Annotated[User, Depends(get_current_user)],
    data: PresignUploadRequest,
) -> PresignUploadResponse:
    """
    Issue a presigned POST target for a direct image upload to object storage.

    The client POSTs a multipart form of the returned `fields` plus the image
    bytes to `url`; the signed policy caps the size (`content-length-range`) and
    pins the content type. The returned `file_url` is referenced when
    creating/updating a listing.

    Requires the user to be a verified seller.
    """
    if not current_user.is_seller:
        raise bad_request_error(
            "You must be a verified seller to upload images."
        )

    return PresignUploadResponse(
        **storage_service.create_presigned_upload(data.content_type, current_user.id)
    )


@router.get(
    "",
    status_code=status.HTTP_200_OK,
    response_model=PaginatedPostsResponse,
)
async def list_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud_dep: AnnotatedPostCRUD,
    like_crud_dep: AnnotatedLikeCRUD,
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
    categories: Annotated[list[PostCategory] | None, Query()] = None,
    subcategories: Annotated[list[str] | None, Query()] = None,
    genders: Annotated[list[Gender] | None, Query()] = None,
    sizes: Annotated[list[str] | None, Query()] = None,
    brands: Annotated[list[str] | None, Query()] = None,
    tags: Annotated[list[str] | None, Query()] = None,
    min_price: Annotated[Decimal | None, Query(ge=0, decimal_places=2)] = None,
    max_price: Annotated[Decimal | None, Query(ge=0, decimal_places=2)] = None,
    search: Annotated[str | None, Query(max_length=200)] = None,
) -> PaginatedPostsResponse:
    """
    List all posts in the marketplace with filtering and pagination.

    Posts are sorted with non-sold items first, then sold items.
    Within each group, posts are sorted by newest first.

    Query parameters:
    - skip: Number of records to skip (for pagination)
    - limit: Maximum number of records to return
    - categories: Filter by top-level category (can specify multiple)
    - subcategories: Filter by granular subcategory (can specify multiple)
    - genders: Filter by department (mens/womens/unisex, can specify multiple)
    - sizes: Group-qualified sizes ("SHOE-39", "WAIST-32"); each constrains only
      posts of its own size group (can specify multiple)
    - brands: Filter by brand slug(s) (can specify multiple)
    - tags: Filter by tag name(s) (can specify multiple; matches any)
    - min_price: Minimum price filter
    - max_price: Maximum price filter
    - search: Search query for title/description

    Response includes like_count and is_liked for each post.
    is_liked is only populated if the user is authenticated.
    """
    posts_with_sold, total = await post_crud_dep.get_posts_with_filters(
        db,
        skip=skip,
        limit=limit,
        categories=categories,
        subcategories=subcategories,
        genders=genders,
        sizes=sizes,
        brand_slugs=brands,
        tags=tags,
        min_price=min_price,
        max_price=max_price,
        search=search,
    )

    # Get like data in batch to avoid N+1
    post_ids = [post.id for post, _ in posts_with_sold]
    like_data = {}
    if post_ids:
        like_data = await like_crud_dep.get_likes_for_posts(
            db,
            post_ids=post_ids,
            user_id=current_user.id if current_user else None,
        )

    # Convert to response schema with is_sold and like info
    items = []
    for post, is_sold in posts_with_sold:
        response_item = PostResponseSchema.model_validate(post)
        response_item.is_sold = is_sold

        if is_sold:
            response_item.is_reserved = False

        post_like_info = like_data.get(post.id, {})
        response_item.like_count = post_like_info.get("count", 0)
        response_item.is_liked = post_like_info.get("is_liked", False)
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
    db: Annotated[AsyncSession, Depends(get_async_db)],
    listing_service: AnnotatedListingService,
    like_crud_dep: AnnotatedLikeCRUD,
    post_id: int,
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
) -> PostResponseSchema:
    """
    Get a specific post by ID.

    Includes ban status for the post and user (optimized single query).
    Also includes like_count and is_liked status.

    Banned posts are only visible to their owner or administrators.
    """
    post = await listing_service.get_listing(
        post_id,
        viewer_user_id=current_user.id if current_user else None,
    )

    if not post:
        raise not_found_error("Post not found")

    # Check if post is banned - only owner or admin can view banned posts
    is_banned = post.is_banned or post.is_user_banned
    if is_banned:
        is_owner = current_user and current_user.id == post.user.id
        is_admin = current_user and current_user.is_admin
        if not (is_owner or is_admin):
            raise not_found_error("Post not found")

    # Get like data
    like_data = await like_crud_dep.get_likes_for_posts(
        db,
        post_ids=[post_id],
        user_id=current_user.id if current_user else None,
    )
    post_like_info = like_data.get(post_id, {})
    post.like_count = post_like_info.get("count", 0)
    post.is_liked = post_like_info.get("is_liked", False)

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
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
) -> PriceBreakdownResponse:
    """
    Get price breakdown for a post.

    Returns the full price breakdown including item price, shipping,
    VAT, platform fee, processing fee, and total. When the requester is
    the post's owner, any fee-free sale promo is reflected.
    """
    method = PaymentMethod(payment_method)
    breakdown = await pricing_service.get_price_breakdown_for_post(
        post_id,
        method,
        viewer_user_id=current_user.id if current_user else None,
    )

    return PriceBreakdownResponse.model_validate(breakdown)


@router.put(
    "/{post_id}",
    status_code=status.HTTP_200_OK,
    response_model=PostResponseSchema,
)
async def update_post(
    listing_service: AnnotatedListingService,
    current_user: Annotated[User, Depends(get_current_user)],
    post_id: int,
    data: PostUpdateRequest,
) -> PostResponseSchema:
    """
    Update an existing listing.

    Only the owner can edit their listing, and sold listings cannot be edited.

    `image_urls` is the final ordered list of public CDN URLs (first = cover),
    uploaded beforehand via presigned URLs (POST /posts/uploads/presign).
    Adding, removing, and reordering images are all expressed by this list.
    Max 10 images.
    """
    return await listing_service.update_listing(
        post_id=post_id,
        owner_id=current_user.id,
        data=data,
    )


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def delete_post(
    listing_service: AnnotatedListingService,
    current_user: Annotated[User, Depends(get_current_user)],
    post_id: int,
) -> None:
    """
    Delete a post (soft delete).

    Only the owner can delete their post. The post is soft-deleted
    to preserve payment records for accounting purposes. Sold listings
    may still be deleted.
    """
    await listing_service.delete_listing(post_id=post_id, owner_id=current_user.id)


@router.get(
    "/preview/earnings",
    status_code=status.HTTP_200_OK,
    response_model=PriceBreakdownResponse,
)
async def preview_earnings(
    pricing_service: AnnotatedPricingService,
    item_price: Annotated[
        Decimal,
        Query(
            ge=MIN_LISTING_PRICE,
            le=MAX_LISTING_PRICE,
            decimal_places=2,
            description="Item price in THB",
        ),
    ],
    shipping_cost: Annotated[
        Decimal,
        Query(
            ge=MIN_SHIPPING_COST,
            le=MAX_SHIPPING_COST,
            decimal_places=2,
            description="Shipping cost in THB",
        ),
    ] = Decimal("0"),
    payment_method: Literal["card", "promptpay"] = Query(
        "card", description="Payment method"
    ),
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
) -> PriceBreakdownResponse:
    """
    Preview seller earnings for a given price and shipping cost.

    This endpoint calculates the price breakdown without requiring an existing post.
    Useful for showing earnings preview during post creation. When the caller
    has fee-free sale credits, the waived breakdown is returned.
    """
    method = PaymentMethod(payment_method)
    breakdown = await pricing_service.preview_earnings(
        item_price,
        shipping_cost,
        method,
        seller_user_id=current_user.id if current_user else None,
    )

    return PriceBreakdownResponse.model_validate(breakdown)
