"""Pricing calculation service for order totals."""

from sqlalchemy.ext.asyncio.session import AsyncSession
from decimal import Decimal, ROUND_UP

from app.core.exceptions import not_found_error
from app.core.settings import get_settings
from app.crud.post import post_crud
from app.schemas.payment import PaymentMethodType, PriceBreakdown


settings = get_settings()

def calculate_order_total(
    item_price: Decimal,
    shipping_cost: Decimal,
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """
    Calculate order total and seller payout.
    
    Buyer pays: item_price + shipping_cost (no extra fees)
    Seller receives: item_price + shipping_cost - (platform_fee + VAT on platform + processing_fee + VAT on processing_fee)
    
    Fees are calculated on (item_price + shipping_cost) to prevent gaming.
    VAT is applied to both platform and processing fees.
    """    
    base_amount = item_price + shipping_cost
    
    platform_fee_percent = Decimal(str(settings.PLATFORM_FEE_PERCENT))
    platform_fee_base = (base_amount * platform_fee_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_UP)
    
    vat_percent = Decimal(str(settings.VAT_PERCENT))
    platform_vat_amount = (platform_fee_base * vat_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_UP)
    
    platform_fee = platform_fee_base + platform_vat_amount
    
    if payment_method == PaymentMethodType.PROMPTPAY:
        base_rate = Decimal(str(settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
    else:
        base_rate = Decimal(str(settings.CARD_PROCESSING_FEE_PERCENT))
    
    processing_vat = Decimal(str(settings.PROCESSING_FEE_VAT_PERCENT))
    effective_rate = (base_rate / 100) * (1 + processing_vat / 100)
    processing_fee = (base_amount * effective_rate).quantize(Decimal("0.01"), rounding=ROUND_UP)
    
    total = item_price + shipping_cost
    
    total_fees = platform_fee + processing_fee
    
    seller_payout = item_price + shipping_cost - total_fees
    
    return PriceBreakdown(
        item_price=item_price,
        shipping_cost=shipping_cost,
        vat_amount=platform_vat_amount,
        processing_fee=processing_fee,
        platform_fee=platform_fee,
        total=total,
        seller_payout=seller_payout,
        total_fees=total_fees,
        vat_percent=settings.VAT_PERCENT,
        processing_fee_percent=float(effective_rate * 100),
        platform_fee_percent=settings.PLATFORM_FEE_PERCENT,
    )


async def get_price_breakdown_for_post(
    db: AsyncSession,
    post_id: int,
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """
    Get price breakdown for a post.
    
    Fetches the post by ID and calculates the full price breakdown.
    Raises not_found_error if post doesn't exist.
    """
    post = await post_crud.get_by_id(db, id=post_id)
    if not post:
        raise not_found_error("Post not found")

    item_price = post.price
    shipping_cost = post.shipping_cost

    return calculate_order_total(item_price, shipping_cost, payment_method)
