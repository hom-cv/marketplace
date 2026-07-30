"""Listing service for purchase, sales, and user listings."""

import posixpath
from typing import Annotated
from urllib.parse import unquote, urlsplit

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.storage import MAX_IMAGES_PER_POST
from app.core.exceptions import (
    bad_request_error,
    forbidden_error,
    post_not_found_error,
    too_many_images_error,
)
from app.crud.brand import BrandCRUD, get_brand_crud
from app.crud.feedback import FeedbackCRUD, get_feedback_crud
from app.crud.payment import PaymentCRUD, get_payment_crud
from app.crud.post import PostCRUD, get_post_crud
from app.crud.tag import TagCRUD, get_tag_crud
from app.db.utils import get_async_db
from app.models.payment import Payment
from app.models.post import Post
from app.schemas.payment import PostSummary, PurchaseListItem, UserSummary
from app.schemas.post import (
    PostCreateSchema,
    PostResponseSchema,
    PostUpdateRequest,
    PostUpdateSchema,
)
from app.services.storage_service import StorageService, _get_storage_service

AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]
AnnotatedPaymentCRUD = Annotated[PaymentCRUD, Depends(get_payment_crud)]
AnnotatedBrandCRUD = Annotated[BrandCRUD, Depends(get_brand_crud)]
AnnotatedTagCRUD = Annotated[TagCRUD, Depends(get_tag_crud)]
AnnotatedFeedbackCRUD = Annotated[FeedbackCRUD, Depends(get_feedback_crud)]
AnnotatedStorageService = Annotated[StorageService, Depends(_get_storage_service)]


def _payment_to_list_item(
    p: Payment,
    include_shipping_address: bool = False,
    has_feedback: bool = False,
) -> PurchaseListItem:
    """Convert Payment model to PurchaseListItem schema."""
    return PurchaseListItem(
        has_feedback=has_feedback,
        payment_id=p.id,
        status=p.status.value.lower(),
        amount=p.amount,
        currency=p.currency,
        payment_method=p.payment_method.value.lower(),
        paid_at=p.paid_at,
        created_at=p.created_date,
        post=PostSummary(
            id=p.post.id,
            title=p.post.title,
            image_url=p.post.image_url,
            price=str(p.post.price),
            shipping_cost=str(p.post.shipping_cost),
        ),
        buyer=UserSummary(id=p.buyer.id, username=p.buyer.username)
        if p.buyer
        else None,
        seller=UserSummary(id=p.seller.id, username=p.seller.username)
        if p.seller
        else None,
        item_price=p.item_price,
        shipping_cost=p.shipping_cost,
        platform_fee=p.platform_fee,
        processing_fee=p.processing_fee,
        total_fees=(p.platform_fee or 0) + (p.processing_fee or 0),
        total_vat=p.total_vat,
        seller_payout=p.seller_payout,
        platform_fee_waived=p.platform_fee_waived,
        fulfillment_status=p.fulfillment_status.value.lower()
        if p.fulfillment_status
        else None,
        tracking_number=p.tracking_number,
        shipped_at=p.shipped_at,
        delivered_at=p.delivered_at,
        shipping_carrier=p.shipping_carrier.value.lower()
        if p.shipping_carrier
        else None,
        shipping_name=p.shipping_name if include_shipping_address else None,
        shipping_phone=p.shipping_phone if include_shipping_address else None,
        shipping_address=p.shipping_address if include_shipping_address else None,
        shipping_district=p.shipping_district if include_shipping_address else None,
        shipping_province=p.shipping_province if include_shipping_address else None,
        shipping_postal_code=p.shipping_postal_code
        if include_shipping_address
        else None,
    )


def _post_with_status_to_response(
    post: Post, is_banned: bool, is_user_banned: bool, is_sold: bool = False
) -> PostResponseSchema:
    """Convert a post with statuses to PostResponseSchema."""
    response = PostResponseSchema.model_validate(post)
    response.is_banned = is_banned
    response.is_user_banned = is_user_banned
    response.is_sold = is_sold

    if is_sold:
        response.is_reserved = False

    return response


class ListingService:
    """Service for purchase and sales listing operations."""

    def __init__(
        self,
        db: AsyncSession,
        post_crud_dep: PostCRUD,
        payment_crud_dep: PaymentCRUD,
        brand_crud_dep: BrandCRUD,
        tag_crud_dep: TagCRUD,
        storage_service: StorageService,
        feedback_crud_dep: FeedbackCRUD,
    ) -> None:
        self.db = db
        self._post_crud = post_crud_dep
        self._payment_crud = payment_crud_dep
        self._brand_crud = brand_crud_dep
        self._tag_crud = tag_crud_dep
        self._storage = storage_service
        self._feedback_crud = feedback_crud_dep

    async def get_purchases(self, buyer_id: int) -> list[PurchaseListItem]:
        """Get all purchases made by a buyer."""
        payments = await self._payment_crud.get_payments_by_buyer(
            self.db, buyer_id=buyer_id
        )
        reviewed_ids = await self._feedback_crud.get_reviewed_payment_ids(
            self.db,
            reviewer_user_id=buyer_id,
            payment_ids=[p.id for p in payments],
        )
        return [
            _payment_to_list_item(p, has_feedback=p.id in reviewed_ids)
            for p in payments
        ]

    async def get_sales(self, seller_id: int) -> list[PurchaseListItem]:
        """Get all sales made by a seller (includes shipping address)."""
        payments = await self._payment_crud.get_payments_by_seller(
            self.db, seller_id=seller_id
        )
        reviewed_ids = await self._feedback_crud.get_payment_ids_with_feedback(
            self.db, payment_ids=[p.id for p in payments]
        )
        return [
            _payment_to_list_item(
                p,
                include_shipping_address=True,
                has_feedback=p.id in reviewed_ids,
            )
            for p in payments
        ]

    async def get_my_listings(
        self,
        user_id: int,
        skip: int = 0,
        limit: int = 50,
    ) -> list[PostResponseSchema]:
        """
        Get all listings by a user with ban status.

        Uses an optimized single query to avoid N+1 issues.

        Args:
            user_id: The user ID.
            skip: Number of records to skip.
            limit: Maximum number of records to return.

        Returns:
            List of PostResponseSchema with is_banned and is_user_banned populated.
        """
        posts_with_ban_status = await self._post_crud.get_by_user_id_with_status(
            self.db, user_id=user_id, skip=skip, limit=limit
        )

        return [
            _post_with_status_to_response(post, is_banned, is_user_banned, is_sold)
            for post, is_banned, is_user_banned, is_sold in posts_with_ban_status
        ]

    async def get_listing(
        self, post_id: int, viewer_user_id: int | None = None
    ) -> PostResponseSchema | None:
        """
        Get a single listing by ID with ban status and sold status.

        Uses an optimized single query to fetch post, ban status, and sold
        status. When the post is reserved and a viewer is given, also resolves
        whether the active reservation is the viewer's own checkout (so the
        reserving buyer keeps a working Buy flow while others see "reserved").

        Args:
            post_id: The post ID.
            viewer_user_id: The requesting user's ID, if authenticated.

        Returns:
            PostResponseSchema with is_banned, is_user_banned, is_sold,
            is_reserved and is_reserved_by_viewer, or None if not found.
        """
        result = await self._post_crud.get_by_id_with_status(self.db, id=post_id)

        if result is None:
            return None

        post, is_banned, is_user_banned, is_sold = result
        response = _post_with_status_to_response(
            post, is_banned, is_user_banned, is_sold
        )
        response.is_reserved_by_viewer = await self._reservation_held_by(
            post, viewer_user_id
        )
        return response

    async def _reservation_held_by(
        self, post: Post, viewer_user_id: int | None
    ) -> bool:
        """
        Check whether the post's active reservation belongs to the given viewer.
        """
        if (
            not post.is_reserved
            or viewer_user_id is None
            or post.reserved_by_payment_id is None
        ):
            return False

        holder = await self._payment_crud.get_by_id(
            self.db, id=post.reserved_by_payment_id
        )

        return holder is not None and holder.buyer_id == viewer_user_id

    def _validate_image_urls(self, image_urls: list[str]) -> None:
        """
        Ensure submitted image URLs are ours (uploaded via presigned URLs).

        Guards against storing arbitrary external URLs: every URL must be on our
        CDN host and, once percent-decoded and normalized, resolve to a key
        under the ``posts/`` prefix. Decoding + ``normpath`` before the prefix
        check means encoded traversal (``..%2f``) can't slip a key outside
        ``posts/`` past a naive substring check. The size cap is enforced by the
        presigned POST policy at upload time (``content-length-range``), so no
        HEAD re-check is needed here.

        Raises:
            HTTPException: 400 if any URL is outside our storage, or storage is
                not configured but URLs were provided; 400 if too many images.
        """
        if len(image_urls) > MAX_IMAGES_PER_POST:
            raise too_many_images_error(
                f"Maximum {MAX_IMAGES_PER_POST} images allowed"
            )

        if not image_urls:
            return

        cdn_url = self._storage.cdn_url

        if not cdn_url:
            raise bad_request_error("Image storage is not configured")

        cdn = urlsplit(cdn_url)
        prefix = self._storage.image_path_prefix  # env-aware, e.g. /posts/ or /posts-dev/

        for url in image_urls:
            parts = urlsplit(url)
            path = posixpath.normpath(unquote(parts.path))

            if (
                parts.scheme != cdn.scheme
                or parts.hostname != cdn.hostname
                or not path.startswith(prefix)
            ):
                raise bad_request_error(f"Invalid image URL: {url}")

    async def _apply_brand_and_tags(
        self, post: Post, *, brand: str | None, tags: list[str]
    ) -> None:
        """Resolve the brand (from the curated list) and tag set onto ``post``.

        ``brand`` is a slug; an unknown/absent one leaves the brand NULL ("Other").
        ``tags`` fully replaces the post's tags.
        """
        post.brand = await self._brand_crud.resolve(self.db, slug=brand)
        post.tags = await self._tag_crud.get_or_create_many(self.db, names=tags)

    async def create_listing(
        self,
        *,
        owner_id: int,
        data: PostCreateSchema,
    ) -> PostResponseSchema:
        """
        Create a listing for the given owner.

        Images must already be uploaded (via presigned URLs); ``data.image_urls``
        holds the public CDN URLs in display order (first = cover).

        Args:
            owner_id: The id of the user creating the listing.
            data: The validated create payload.

        Returns:
            The created PostResponseSchema.

        Raises:
            HTTPException: 400 if any image URL is not ours / too many images.
        """
        self._validate_image_urls(data.image_urls)

        post = Post(
            title=data.title,
            description=data.description,
            category=data.category,
            subcategory=data.subcategory,
            gender=data.gender,
            price=data.price,
            shipping_cost=data.shipping_cost,
            size=data.size,
            measurements=data.measurements,
            image_url=data.image_urls[0] if data.image_urls else None,
            image_urls=data.image_urls,
            user_id=owner_id,
        )
        await self._apply_brand_and_tags(post, brand=data.brand, tags=data.tags)
        created_post = await self._post_crud.create_post(self.db, post=post)
        await self.db.commit()
        return PostResponseSchema.model_validate(created_post)

    async def update_listing(
        self,
        *,
        post_id: int,
        owner_id: int,
        data: PostUpdateRequest,
    ) -> PostResponseSchema:
        """
        Update a listing owned by the current user.

        ``data.image_urls`` is the final ordered set of (already-uploaded) image
        URLs — adding, removing, and reordering are all expressed by this list,
        with the first entry as the cover. Images dropped from the listing are
        left in storage; reclaiming them is handled out-of-band.

        Args:
            post_id: The post to update.
            owner_id: The id of the user attempting the update.
            data: The validated update payload.

        Returns:
            The updated PostResponseSchema with ban/sold status.

        Raises:
            HTTPException: 404 if not found, 403 if not the owner, 400 if the
                listing is already sold or an image URL is invalid.
        """
        result = await self._post_crud.get_by_id_with_status(self.db, id=post_id)
        if result is None:
            raise post_not_found_error(post_id)

        post, _, _, is_sold = result

        if post.user_id != owner_id:
            raise forbidden_error("You can only edit your own listings")

        if is_sold:
            raise bad_request_error("Sold listings cannot be edited")

        self._validate_image_urls(data.image_urls)

        # TODO(storage-gc): reclaim unreferenced Spaces objects out-of-band, via
        # a bucket lifecycle/TTL rule or a periodic sweep that deletes keys not
        # referenced by any post's image_urls.

        post.category = data.category
        post.subcategory = data.subcategory
        post.gender = data.gender
        post.image_urls = data.image_urls
        post.image_url = data.image_urls[0] if data.image_urls else None
        # Full replace: brand/tags reflect exactly what the payload carries.
        await self._apply_brand_and_tags(post, brand=data.brand, tags=data.tags)

        # Plain scalar edits flow through the CRUD via the update schema.
        obj_in = PostUpdateSchema(
            title=data.title,
            description=data.description,
            price=data.price,
            shipping_cost=data.shipping_cost,
            size=data.size,
            measurements=data.measurements,
        )
        await self._post_crud.update(self.db, db_obj=post, obj_in=obj_in)
        await self.db.commit()

        refreshed = await self._post_crud.get_by_id_with_status(self.db, id=post_id)
        if refreshed is None:
            raise post_not_found_error(post_id)
        updated_post, is_banned, is_user_banned, is_sold = refreshed
        return _post_with_status_to_response(
            updated_post, is_banned, is_user_banned, is_sold
        )

    async def delete_listing(self, *, post_id: int, owner_id: int) -> None:
        """
        Soft delete a listing owned by the current user.

        The post is soft-deleted (``deleted_at`` set) to preserve payment
        records for accounting; images are intentionally left in storage.
        Sold listings may still be deleted.

        Args:
            post_id: The post to delete.
            owner_id: The id of the user attempting the deletion.

        Raises:
            HTTPException: 404 if not found, 403 if not the owner.
        """
        post = await self._post_crud.get_by_id_with_user(self.db, id=post_id)
        if not post:
            raise post_not_found_error(post_id)

        if post.user_id != owner_id:
            raise forbidden_error("You can only delete your own listings")

        await self._post_crud.soft_delete(self.db, post=post)
        await self.db.commit()


def _get_listing_service(
    post_crud_dep: AnnotatedPostCRUD,
    payment_crud_dep: AnnotatedPaymentCRUD,
    brand_crud_dep: AnnotatedBrandCRUD,
    tag_crud_dep: AnnotatedTagCRUD,
    storage_service: AnnotatedStorageService,
    feedback_crud_dep: AnnotatedFeedbackCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> ListingService:
    """Factory function to create ListingService instance."""
    return ListingService(
        db,
        post_crud_dep,
        payment_crud_dep,
        brand_crud_dep,
        tag_crud_dep,
        storage_service,
        feedback_crud_dep,
    )


AnnotatedListingService = Annotated[ListingService, Depends(_get_listing_service)]
