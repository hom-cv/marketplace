"""Unit tests for PricingService.

Tests verify fee calculations, rounding behavior, and payout accuracy.
Fee model: 10% platform fee + processing fee + transfer fee, all seller-side.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.schemas.payment import PaymentMethodType
from app.services.pricing_service import PricingService


@pytest.fixture
def mock_settings():
    """Create mock settings with known fee percentages."""
    settings = MagicMock()
    settings.PLATFORM_FEE_PERCENT = Decimal("10.0")
    settings.VAT_PERCENT = Decimal("7.0")
    settings.CARD_PROCESSING_FEE_PERCENT = Decimal("3.65")
    settings.PROMPTPAY_PROCESSING_FEE_PERCENT = Decimal("1.65")
    settings.PROCESSING_FEE_VAT_PERCENT = Decimal("7.0")
    settings.TRANSFER_FEE = Decimal("30.0")
    return settings


@pytest.fixture
def pricing_service(mock_settings):
    """Create PricingService instance with mock dependencies."""
    mock_db = AsyncMock()
    mock_post_crud = MagicMock()
    return PricingService(db=mock_db, settings=mock_settings, post_crud_dep=mock_post_crud)


class TestCalculateOrderTotal:
    """Tests for calculate_order_total method."""

    def test_buyer_total_is_item_plus_shipping(self, pricing_service):
        """Buyer pays item_price + shipping_cost only."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("100.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        assert result.total == Decimal("1100.00")

    def test_card_processing_fee_calculation(self, pricing_service):
        """Card processing fee should be 3.65% + 7% VAT on that fee."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Processing fee base: 1000 * 3.65% = 36.50
        # Processing VAT: 36.50 * 7% = 2.555 -> 2.56 (ROUND_UP)
        # Total processing: 36.50 + 2.56 = 39.06
        assert result.processing_fee == Decimal("39.06")

    def test_promptpay_processing_fee_lower_than_card(self, pricing_service):
        """PromptPay should have lower processing fee (1.65% vs 3.65%)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        card_result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )
        promptpay_result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.PROMPTPAY,
        )

        assert promptpay_result.processing_fee < card_result.processing_fee

    def test_platform_fee_calculation(self, pricing_service):
        """Platform fee should be 10% + 7% VAT (transfer fee is separate)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Platform fee base: 1000 * 10% = 100.00
        # Platform VAT: 100 * 7% = 7.00
        # Total platform: 100.00 + 7.00 = 107.00
        assert result.platform_fee == Decimal("107.00")
        assert result.transfer_fee == Decimal("30.00")

    def test_seller_payout_is_base_minus_fees(self, pricing_service):
        """Seller payout = base_amount - total_fees."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("100.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        base_amount = item_price + shipping_cost
        assert result.seller_payout == base_amount - result.total_fees

    def test_total_fees_equals_platform_plus_transfer_plus_processing(self, pricing_service):
        """Total fees = platform_fee + transfer_fee + processing_fee."""
        item_price = Decimal("500.00")
        shipping_cost = Decimal("50.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        assert result.total_fees == result.platform_fee + result.transfer_fee + result.processing_fee

    def test_zero_shipping_cost(self, pricing_service):
        """Calculations should work with zero shipping cost."""
        item_price = Decimal("100.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        assert result.shipping_cost == Decimal("0.00")
        assert result.total == item_price

    def test_response_includes_all_required_fields(self, pricing_service):
        """Result should contain all PriceBreakdown fields."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("100.00"),
            shipping_cost=Decimal("10.00"),
            payment_method=PaymentMethodType.CARD,
        )

        assert hasattr(result, "item_price")
        assert hasattr(result, "shipping_cost")
        assert hasattr(result, "platform_fee")
        assert hasattr(result, "transfer_fee")
        assert hasattr(result, "processing_fee")
        assert hasattr(result, "total_fees")
        assert hasattr(result, "total_vat")
        assert hasattr(result, "total")
        assert hasattr(result, "seller_payout")

    def test_rounding_uses_round_up(self, pricing_service):
        """Fees should round up to protect against underpayment."""
        item_price = Decimal("333.33")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Platform fee base: 333.33 * 10% = 33.333 -> 33.34 (ROUND_UP)
        # Platform VAT: 33.34 * 7% = 2.3338 -> 2.34 (ROUND_UP)
        # Total platform fee: 33.34 + 2.34 = 35.68
        assert result.platform_fee == Decimal("35.68")
        assert result.transfer_fee == Decimal("30.00")

    def test_total_vat_includes_platform_and_processing(self, pricing_service):
        """Total VAT should include platform VAT + processing VAT."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Platform VAT: 100 * 7% = 7.00
        # Processing VAT: 36.50 * 7% = 2.56 (ROUND_UP)
        # Total VAT: 7.00 + 2.56 = 9.56
        assert result.total_vat == Decimal("9.56")
