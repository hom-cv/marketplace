"""Listing service for purchase, sales, and user listings."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants.storage import MAX_IMAGES_PER_POST
from app.core.exceptions import (
    bad_request_error,
    forbidden_error,
    post_not_found_error,
    too_many_images_error,
)
from app.crud.payment import PaymentCRUD, get_payment_crud
from app.crud.post import PostCRUD, get_post_crud
from app.db.utils import get_async_db
from app.models.payment import Payment
from app.models.post import Post, PostType
from app.schemas.payment import PostSummary, PurchaseListItem, UserSummary
from app.schemas.post import PostResponseSchema, PostUpdateRequest, PostUpdateSchema
from app.services.storage_service import StorageService, _get_storage_service

# Manifest token prefix used in `image_order` to reference a freshly uploaded
# file by its position in the `images` list, e.g. "new:0" -> first upload.
NEW_IMAGE_PREFIX = "new:"

AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]
AnnotatedPaymentCRUD = Annotated[PaymentCRUD, Depends(get_payment_crud)]
AnnotatedStorageService = Annotated[StorageService, Depends(_get_storage_service)]


def _payment_to_list_item(
    p: Payment, include_shipping_address: bool = False
) -> PurchaseListItem:
    """Convert Payment model to PurchaseListItem schema."""
    return PurchaseListItem(
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
    return response


class ListingService:
    """Service for purchase and sales listing operations."""

    def __init__(
        self,
        db: AsyncSession,
        post_crud_dep: PostCRUD,
        payment_crud_dep: PaymentCRUD,
        storage_service: StorageService,
    ) -> None:
        self.db = db
        self._post_crud = post_crud_dep
        self._payment_crud = payment_crud_dep
        self._storage = storage_service

    async def get_purchases(self, buyer_id: int) -> list[PurchaseListItem]:
        """Get all purchases made by a buyer."""
        payments = await self._payment_crud.get_payments_by_buyer(
            self.db, buyer_id=buyer_id
        )
        return [_payment_to_list_item(p) for p in payments]

    async def get_sales(self, seller_id: int) -> list[PurchaseListItem]:
        """Get all sales made by a seller (includes shipping address)."""
        payments = await self._payment_crud.get_payments_by_seller(
            self.db, seller_id=seller_id
        )
        return [
            _payment_to_list_item(p, include_shipping_address=True) for p in payments
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

    async def get_listing(self, post_id: int) -> PostResponseSchema | None:
        """
        Get a single listing by ID with ban status and sold status.

        Uses an optimized single query to fetch post, ban status, and sold status.

        Args:
            post_id: The post ID.

        Returns:
            PostResponseSchema with is_banned, is_user_banned, and is_sold, or None if not found.
        """
        result = await self._post_crud.get_by_id_with_status(self.db, id=post_id)

        if result is None:
            return None

        post, is_banned, is_user_banned, is_sold = result
        return _post_with_status_to_response(post, is_banned, is_user_banned, is_sold)

    async def update_listing(
        self,
        *,
        post_id: int,
        owner_id: int,
        data: PostUpdateRequest,
    ) -> PostResponseSchema:
        """
        Update a listing owned by the current user.

        Image reconciliation is driven by ``data.image_order``, an ordered
        manifest where each entry is either an existing image URL to keep or a
        ``"new:<index>"`` token referencing the i-th file in ``data.images``.
        This lets the seller freely reorder, add, and remove images (the first
        entry becomes the cover). Images dropped from the listing are left in
        storage; reclaiming them is handled out-of-band (see the storage-gc
        note below).

        Args:
            post_id: The post to update.
            owner_id: The id of the user attempting the update.
            data: The validated update payload (fields, manifest, and uploads).

        Returns:
            The updated PostResponseSchema with ban/sold status.

        Raises:
            HTTPException: 404 if not found, 403 if not the owner, 400 if the
                listing is already sold, the image count exceeds the limit, or
                the manifest is inconsistent with the uploaded files.
        """
        result = await self._post_crud.get_by_id_with_status(self.db, id=post_id)
        if result is None:
            raise post_not_found_error(post_id)

        post, _, _, is_sold = result

        if post.user_id != owner_id:
            raise forbidden_error("You can only edit your own listings")

        if is_sold:
            raise bad_request_error("Sold listings cannot be edited")

        current_urls = list(post.image_urls or [])
        valid_new_images = [f for f in data.images if f and f.filename]
        image_order = data.image_order or []

        if len(image_order) > MAX_IMAGES_PER_POST:
            raise too_many_images_error(
                f"Maximum {MAX_IMAGES_PER_POST} images allowed"
            )

        # The manifest must reference exactly the uploaded files, no more or less.
        new_token_count = sum(
            1 for token in image_order if token.startswith(NEW_IMAGE_PREFIX)
        )
        if new_token_count != len(valid_new_images):
            raise bad_request_error(
                "Uploaded images do not match the image order manifest"
            )

        # Upload new images before mutating the post so a storage failure
        # leaves the existing listing untouched.
        new_urls = await self._storage.upload_images(valid_new_images, folder="posts")

        final_urls: list[str] = []
        for token in image_order:
            if token.startswith(NEW_IMAGE_PREFIX):
                try:
                    idx = int(token[len(NEW_IMAGE_PREFIX) :])
                    final_urls.append(new_urls[idx])
                except (ValueError, IndexError):
                    raise bad_request_error(f"Invalid image reference: {token}")
            elif token in current_urls:
                final_urls.append(token)

        # TODO(storage-gc): reclaim unreferenced Spaces objects out-of-band, via
        # a bucket lifecycle/TTL rule or a periodic sweep that deletes keys not
        # referenced by any post's image_urls.

        # Fields needing service-side handling: type (schema -> model enum) and
        # the image fields (computed from the manifest + uploads).
        post.type = PostType[data.type.value]
        post.image_urls = final_urls
        post.image_url = final_urls[0] if final_urls else None

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
    storage_service: AnnotatedStorageService,
    db: AsyncSession = Depends(get_async_db),
) -> ListingService:
    """Factory function to create ListingService instance."""
    return ListingService(db, post_crud_dep, payment_crud_dep, storage_service)


AnnotatedListingService = Annotated[ListingService, Depends(_get_listing_service)]
