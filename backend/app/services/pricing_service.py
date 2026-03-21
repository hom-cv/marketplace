"""Pricing calculation service for order totals."""

from decimal import ROUND_UP, Decimal
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.core.exceptions import not_found_error
from app.core.settings import AnnotatedSettings, Settings
from app.crud.post import PostCRUD, get_post_crud
from app.db.utils import get_async_db
from app.schemas.payment import PaymentMethodType, PriceBreakdown

AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud)]


class PricingService:
    """Service for pricing calculations."""

    def __init__(self, db: AsyncSession, settings: Settings, post_crud_dep: PostCRUD):
        """
        Initialize PricingService.

        Args:
            db (AsyncSession): The database session.
            settings (Settings): The application settings.
            post_crud_dep (PostCRUD): Post CRUD operations.
        """
        self.db = db
        self._settings = settings
        self._post_crud = post_crud_dep

    def calculate_order_total(
        self,
        item_price: Decimal,
        shipping_cost: Decimal,
        payment_method: PaymentMethodType = PaymentMethodType.CARD,
    ) -> PriceBreakdown:
        """
        Calculate order total and seller payout.

        All fees are on the seller side:
        - Buyer pays: item_price + shipping_cost
        - Seller receives: item_price + shipping_cost - platform_fee - processing_fee
        """
        base_amount = item_price + shipping_cost
        vat_percent = Decimal(str(self._settings.VAT_PERCENT))

        # Platform fee: 10% + VAT — deducted from seller
        platform_fee_percent = Decimal(str(self._settings.PLATFORM_FEE_PERCENT))
        platform_fee_base = (base_amount * platform_fee_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        platform_vat = (platform_fee_base * vat_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        platform_fee = platform_fee_base + platform_vat

        # Transfer fee: flat Omise payout fee — deducted from seller
        transfer_fee = Decimal(str(self._settings.TRANSFER_FEE))

        # Processing fee: Omise rate + VAT — deducted from seller
        if payment_method == PaymentMethodType.PROMPTPAY:
            base_rate = Decimal(str(self._settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
        else:
            base_rate = Decimal(str(self._settings.CARD_PROCESSING_FEE_PERCENT))

        processing_fee_base = (base_amount * (base_rate / 100)).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        processing_vat_percent = Decimal(str(self._settings.PROCESSING_FEE_VAT_PERCENT))
        processing_vat = (processing_fee_base * processing_vat_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        processing_fee = processing_fee_base + processing_vat

        # Totals
        total = base_amount  # What buyer pays
        total_fees = platform_fee + transfer_fee + processing_fee  # Deducted from seller
        total_vat = platform_vat + processing_vat
        seller_payout = base_amount - total_fees

        return PriceBreakdown(
            item_price=item_price,
            shipping_cost=shipping_cost,
            platform_fee=platform_fee,
            transfer_fee=transfer_fee,
            processing_fee=processing_fee,
            total_fees=total_fees,
            total_vat=total_vat,
            total=total,
            seller_payout=seller_payout,
        )

    async def get_price_breakdown_for_post(
        self,
        post_id: int,
        payment_method: PaymentMethodType = PaymentMethodType.CARD,
    ) -> PriceBreakdown:
        """Get price breakdown for a post."""
        post = await self._post_crud.get_by_id(self.db, id=post_id)
        if not post:
            raise not_found_error("Post not found")

        return self.calculate_order_total(
            post.price, post.shipping_cost, payment_method
        )


def _get_pricing_service(
    settings: AnnotatedSettings,
    post_crud_dep: AnnotatedPostCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> PricingService:
    """Factory function to create PricingService instance."""
    return PricingService(db, settings, post_crud_dep)


AnnotatedPricingService = Annotated[PricingService, Depends(_get_pricing_service)]
