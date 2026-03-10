"""Listing service for purchase, sales, and user listings."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.payment import PaymentCRUD, get_payment_crud
from app.crud.post import PostCRUD, get_post_crud
from app.db.utils import get_async_db
from app.models.payment import Payment
from app.models.post import Post
from app.schemas.payment import PostSummary, PurchaseListItem, UserSummary
from app.schemas.post import PostResponseSchema

AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]
AnnotatedPaymentCRUD = Annotated[PaymentCRUD, Depends(get_payment_crud)]


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
        platform_fee=(p.platform_fee or 0) + (p.transfer_fee or 0),
        processing_fee=p.processing_fee,
        total_fees=(p.platform_fee or 0) + (p.processing_fee or 0) + (p.transfer_fee or 0),
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
    ) -> None:
        self.db = db
        self._post_crud = post_crud_dep
        self._payment_crud = payment_crud_dep

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


def _get_listing_service(
    post_crud_dep: AnnotatedPostCRUD,
    payment_crud_dep: AnnotatedPaymentCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> ListingService:
    """Factory function to create ListingService instance."""
    return ListingService(db, post_crud_dep, payment_crud_dep)


AnnotatedListingService = Annotated[ListingService, Depends(_get_listing_service)]
