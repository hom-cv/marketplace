"""Listing service for purchase and sales history."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.payment import payment_crud
from app.models.payment import Payment
from app.schemas.payment import PostSummary, PurchaseListItem, UserSummary


def _payment_to_list_item(p: Payment, include_shipping_address: bool = False) -> PurchaseListItem:
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
        buyer=UserSummary(id=p.buyer.id, username=p.buyer.username) if p.buyer else None,
        seller=UserSummary(id=p.seller.id, username=p.seller.username) if p.seller else None,
        item_price=p.item_price,
        shipping_cost=p.shipping_cost,
        vat_amount=p.vat_amount,
        processing_fee=p.processing_fee,
        platform_fee=p.platform_fee,
        total_fees=(p.platform_fee or 0) + (p.processing_fee or 0),
        seller_payout=p.seller_payout,
        fulfillment_status=p.fulfillment_status.value.lower() if p.fulfillment_status else None,
        tracking_number=p.tracking_number,
        shipped_at=p.shipped_at,
        delivered_at=p.delivered_at,
        shipping_carrier=p.shipping_carrier.value.lower() if p.shipping_carrier else None,
        shipping_name=p.shipping_name if include_shipping_address else None,
        shipping_phone=p.shipping_phone if include_shipping_address else None,
        shipping_address=p.shipping_address if include_shipping_address else None,
        shipping_district=p.shipping_district if include_shipping_address else None,
        shipping_province=p.shipping_province if include_shipping_address else None,
        shipping_postal_code=p.shipping_postal_code if include_shipping_address else None,
    )


class ListingService:
    """Service for purchase and sales listing operations."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_purchases(self, buyer_id: int) -> list[PurchaseListItem]:
        """Get all purchases made by a buyer."""
        payments = await payment_crud.get_payments_by_buyer(self.db, buyer_id=buyer_id)
        return [_payment_to_list_item(p) for p in payments]

    async def get_sales(self, seller_id: int) -> list[PurchaseListItem]:
        """Get all sales made by a seller (includes shipping address)."""
        payments = await payment_crud.get_payments_by_seller(self.db, seller_id=seller_id)
        return [_payment_to_list_item(p, include_shipping_address=True) for p in payments]
