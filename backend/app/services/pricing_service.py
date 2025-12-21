"""Pricing calculation service for order totals."""

from sqlalchemy.ext.asyncio.session import AsyncSession
from decimal import Decimal, ROUND_UP

from app.core.exceptions import not_found_error
from app.core.settings import get_settings
from app.crud.post import post_crud
from app.schemas.payment import PaymentMethodType, PriceBreakdown


def calculate_order_total(
    item_price: Decimal,
    shipping_cost: Decimal,
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """
    Calculate order total and seller payout.
    
    Buyer pays: item_price + shipping_cost (no extra fees)
    Seller receives: item_price + shipping_cost - total_fees
    
    Fees breakdown:
    - Platform fee: base_amount * platform_fee_percent + VAT
    - Processing fee: base_amount * processing_rate * (1 + VAT)
    
    total_fees = platform_fee + processing_fee (both include VAT)
    total_vat = platform_vat + processing_vat
    """
    settings = get_settings()
    base_amount = item_price + shipping_cost
    
    # Platform fee calculation
    platform_fee_percent = Decimal(str(settings.PLATFORM_FEE_PERCENT))
    platform_fee_base = (base_amount * platform_fee_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_UP)
    
    vat_percent = Decimal(str(settings.VAT_PERCENT))
    platform_vat = (platform_fee_base * vat_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_UP)
    platform_fee = platform_fee_base + platform_vat
    
    # Processing fee calculation (includes VAT)
    if payment_method == PaymentMethodType.PROMPTPAY:
        base_rate = Decimal(str(settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
    else:
        base_rate = Decimal(str(settings.CARD_PROCESSING_FEE_PERCENT))
    
    processing_fee_base = (base_amount * (base_rate / 100)).quantize(Decimal("0.01"), rounding=ROUND_UP)
    processing_vat_percent = Decimal(str(settings.PROCESSING_FEE_VAT_PERCENT))
    processing_vat = (processing_fee_base * processing_vat_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_UP)
    processing_fee = processing_fee_base + processing_vat
    
    # Totals
    total = item_price + shipping_cost
    total_fees = platform_fee + processing_fee
    total_vat = platform_vat + processing_vat
    seller_payout = total - total_fees
    
    return PriceBreakdown(
        item_price=item_price,
        shipping_cost=shipping_cost,
        platform_fee=platform_fee,
        processing_fee=processing_fee,
        total_fees=total_fees,
        total_vat=total_vat,
        total=total,
        seller_payout=seller_payout,
    )


async def get_price_breakdown_for_post(
    db: AsyncSession,
    post_id: int,
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """Get price breakdown for a post."""
    post = await post_crud.get_by_id(db, id=post_id)
    if not post:
        raise not_found_error("Post not found")

    return calculate_order_total(post.price, post.shipping_cost, payment_method)
