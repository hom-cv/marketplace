"""Pricing calculation service for order totals."""

from decimal import ROUND_UP, Decimal
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.core.exceptions import not_found_error
from app.core.settings import AnnotatedSettings, Settings
from app.crud.post import PostCRUD, post_crud
from app.db.utils import get_async_db
from app.schemas.payment import PaymentMethodType, PriceBreakdown


def get_post_crud_for_pricing() -> PostCRUD:
    """Dependency to get PostCRUD instance."""
    return post_crud


AnnotatedPostCRUD = Annotated[PostCRUD, Depends(get_post_crud_for_pricing)]


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
        self.settings = settings
        self._post_crud = post_crud_dep

    def calculate_order_total(
        self,
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
        base_amount = item_price + shipping_cost

        # Platform fee calculation
        platform_fee_percent = Decimal(str(self.settings.PLATFORM_FEE_PERCENT))
        platform_fee_base = (base_amount * platform_fee_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )

        vat_percent = Decimal(str(self.settings.VAT_PERCENT))
        platform_vat = (platform_fee_base * vat_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        platform_fee = platform_fee_base + platform_vat

        # Processing fee calculation (includes VAT)
        if payment_method == PaymentMethodType.PROMPTPAY:
            base_rate = Decimal(str(self.settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
        else:
            base_rate = Decimal(str(self.settings.CARD_PROCESSING_FEE_PERCENT))

        processing_fee_base = (base_amount * (base_rate / 100)).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        processing_vat_percent = Decimal(str(self.settings.PROCESSING_FEE_VAT_PERCENT))
        processing_vat = (processing_fee_base * processing_vat_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
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

