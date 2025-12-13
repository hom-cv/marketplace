"""Pricing calculation service for order totals."""

from decimal import Decimal, ROUND_HALF_UP
from dataclasses import dataclass
from enum import Enum

from app.core.settings import get_settings


class PaymentMethodType(str, Enum):
    """Payment method types."""
    CARD = "card"
    PROMPTPAY = "promptpay"


@dataclass
class PriceBreakdown:
    """Price breakdown for an order."""
    item_price: Decimal
    shipping_cost: Decimal
    vat_amount: Decimal
    processing_fee: Decimal
    platform_fee: Decimal
    total: Decimal
    vat_percent: float
    processing_fee_percent: float
    platform_fee_percent: float


def calculate_order_total(
    item_price: Decimal,
    shipping_cost: Decimal,
    payment_method: PaymentMethodType = PaymentMethodType.CARD,
) -> PriceBreakdown:
    """Calculate order total with all fees. Processing fee added last using gross-up."""
    settings = get_settings()
    
    # VAT on item price
    vat_percent = Decimal(str(settings.VAT_PERCENT))
    vat_amount = (item_price * vat_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    # Platform fee on item price
    platform_fee_percent = Decimal(str(settings.PLATFORM_FEE_PERCENT))
    platform_fee = (item_price * platform_fee_percent / 100).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
    
    # Subtotal before processing
    subtotal = item_price + shipping_cost + vat_amount + platform_fee
    
    # Processing fee with VAT (gross-up formula: subtotal * rate / (1 - rate))
    if payment_method == PaymentMethodType.PROMPTPAY:
        base_rate = Decimal(str(settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
    else:
        base_rate = Decimal(str(settings.CARD_PROCESSING_FEE_PERCENT))
    
    processing_vat = Decimal(str(settings.PROCESSING_FEE_VAT_PERCENT))
    effective_rate = (base_rate / 100) * (1 + processing_vat / 100)
    processing_fee = (subtotal * effective_rate / (1 - effective_rate)).quantize(
        Decimal("0.01"), rounding=ROUND_HALF_UP
    )
    
    total = subtotal + processing_fee
    
    return PriceBreakdown(
        item_price=item_price,
        shipping_cost=shipping_cost,
        vat_amount=vat_amount,
        processing_fee=processing_fee,
        platform_fee=platform_fee,
        total=total,
        vat_percent=settings.VAT_PERCENT,
        processing_fee_percent=float(effective_rate * 100),
        platform_fee_percent=settings.PLATFORM_FEE_PERCENT,
    )
