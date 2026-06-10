"""Pricing calculation service for order totals."""

from decimal import ROUND_UP, Decimal
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio.session import AsyncSession

from app.core.exceptions import not_found_error
from app.core.settings import AnnotatedSettings, Settings
from app.crud.post import PostCRUD, get_post_crud
from app.crud.seller import seller_crud
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
        *,
        waive_platform_fee: bool = False,
    ) -> PriceBreakdown:
        """
        Calculate order total and seller payout.

        All fees are on the seller side:
        - Buyer pays: item_price + shipping_cost
        - Seller receives: item_price + shipping_cost - platform_fee - processing_fee

        With ``waive_platform_fee`` (founding-seller promo) the platform fee
        and its VAT are zeroed; the processing fee still applies.
        """
        base_amount = item_price + shipping_cost
        vat_percent = Decimal(str(self._settings.VAT_PERCENT))

        # Platform fee: 10% + VAT — deducted from seller unless waived
        if waive_platform_fee:
            platform_vat = Decimal("0.00")
            platform_fee = Decimal("0.00")
        else:
            platform_fee_percent = Decimal(str(self._settings.PLATFORM_FEE_PERCENT))
            platform_fee_base = (base_amount * platform_fee_percent / 100).quantize(
                Decimal("0.01"), rounding=ROUND_UP
            )
            platform_vat = (platform_fee_base * vat_percent / 100).quantize(
                Decimal("0.01"), rounding=ROUND_UP
            )
            platform_fee = platform_fee_base + platform_vat

        # Processing fee: Stripe Thailand rate (percentage + fixed) + VAT —
        # deducted from seller
        if payment_method == PaymentMethodType.PROMPTPAY:
            base_rate = Decimal(str(self._settings.PROMPTPAY_PROCESSING_FEE_PERCENT))
            fixed_fee_thb = Decimal(
                str(self._settings.PROMPTPAY_PROCESSING_FEE_FIXED_THB)
            )
        else:
            base_rate = Decimal(str(self._settings.CARD_PROCESSING_FEE_PERCENT))
            fixed_fee_thb = Decimal(
                str(self._settings.CARD_PROCESSING_FEE_FIXED_THB)
            )

        processing_fee_base = (
            (base_amount * base_rate / 100) + fixed_fee_thb
        ).quantize(Decimal("0.01"), rounding=ROUND_UP)
        processing_vat_percent = Decimal(str(self._settings.PROCESSING_FEE_VAT_PERCENT))
        processing_vat = (processing_fee_base * processing_vat_percent / 100).quantize(
            Decimal("0.01"), rounding=ROUND_UP
        )
        processing_fee = processing_fee_base + processing_vat

        # Totals
        total = base_amount  # What buyer pays
        total_fees = platform_fee + processing_fee  # Deducted from seller
        total_vat = platform_vat + processing_vat
        seller_payout = base_amount - total_fees

        return PriceBreakdown(
            item_price=item_price,
            shipping_cost=shipping_cost,
            platform_fee=platform_fee,
            processing_fee=processing_fee,
            total_fees=total_fees,
            total_vat=total_vat,
            total=total,
            seller_payout=seller_payout,
            platform_fee_waived=waive_platform_fee,
        )

    async def _seller_has_fee_free_credit(self, user_id: int) -> bool:
        """Whether the user has founding-seller fee-free sale credits left."""
        profile = await seller_crud.get_by_user_id(self.db, user_id=user_id)
        return bool(profile and profile.fee_free_sales_remaining > 0)

    async def get_price_breakdown_for_post(
        self,
        post_id: int,
        payment_method: PaymentMethodType = PaymentMethodType.CARD,
        viewer_user_id: int | None = None,
    ) -> PriceBreakdown:
        """
        Get price breakdown for a post.

        The fee waiver is reflected only when the viewer is the post's owner
        (their "Your earnings" view); buyers always see the standard
        breakdown — their total is identical either way and the seller's
        promo status is not leaked.
        """
        post = await self._post_crud.get_by_id(self.db, id=post_id)
        if not post:
            raise not_found_error("Post not found")

        waive = (
            viewer_user_id == post.user_id
            and await self._seller_has_fee_free_credit(post.user_id)
        )

        return self.calculate_order_total(
            post.price,
            post.shipping_cost,
            payment_method,
            waive_platform_fee=waive,
        )

    async def preview_earnings(
        self,
        item_price: Decimal,
        shipping_cost: Decimal,
        payment_method: PaymentMethodType = PaymentMethodType.CARD,
        seller_user_id: int | None = None,
    ) -> PriceBreakdown:
        """Earnings preview for a prospective listing by the given seller."""
        waive = seller_user_id is not None and await self._seller_has_fee_free_credit(
            seller_user_id
        )
        return self.calculate_order_total(
            item_price,
            shipping_cost,
            payment_method,
            waive_platform_fee=waive,
        )


def _get_pricing_service(
    settings: AnnotatedSettings,
    post_crud_dep: AnnotatedPostCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> PricingService:
    """Factory function to create PricingService instance."""
    return PricingService(db, settings, post_crud_dep)


AnnotatedPricingService = Annotated[PricingService, Depends(_get_pricing_service)]
