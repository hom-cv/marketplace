"""Unit tests for PricingService.

Tests verify fee calculations, rounding behavior, and payout accuracy.
Fee model: 10% platform fee + Stripe Thailand processing fee (percentage +
fixed per-charge THB), all seller-side.
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
    settings.CARD_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    settings.PROMPTPAY_PROCESSING_FEE_PERCENT = Decimal("2.0")
    settings.PROMPTPAY_PROCESSING_FEE_FIXED_THB = Decimal("10.0")
    settings.PROCESSING_FEE_VAT_PERCENT = Decimal("7.0")
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
        """Card processing fee = (amount * 3.65% + 10 THB) + 7% VAT."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Processing fee base: 1000 * 3.65% + 10 = 46.50
        # Processing VAT: 46.50 * 7% = 3.255 -> 3.26 (ROUND_UP)
        # Total processing: 46.50 + 3.26 = 49.76
        assert result.processing_fee == Decimal("49.76")

    def test_promptpay_processing_fee_lower_than_card(self, pricing_service):
        """PromptPay should have lower processing fee (2% vs 3.65%)."""
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

    def test_fixed_fee_is_added_once_per_charge(self, pricing_service):
        """The fixed per-charge THB fee should be added once, not scaled with amount."""
        small = pricing_service.calculate_order_total(
            item_price=Decimal("100.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethodType.CARD,
        )
        big = pricing_service.calculate_order_total(
            item_price=Decimal("10000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethodType.CARD,
        )

        # For 100 THB: base = 100*3.65% + 10 = 13.65
        # For 10000 THB: base = 10000*3.65% + 10 = 375.00
        # The +10 flat is present in both; percentage scales with amount.
        # Small-amount check: the +10 must be included (sanity bounds).
        assert small.processing_fee > Decimal("13.0")
        assert small.processing_fee < Decimal("15.0")
        # Big-amount check: the +10 is only added once (would be 400+ if doubled).
        assert big.processing_fee < Decimal("410.00")

    def test_platform_fee_calculation(self, pricing_service):
        """Platform fee should be 10% + 7% VAT (no separate transfer fee)."""
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

    def test_total_fees_equals_platform_plus_processing(self, pricing_service):
        """Total fees = platform_fee + processing_fee (no transfer fee)."""
        item_price = Decimal("500.00")
        shipping_cost = Decimal("50.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        assert result.total_fees == result.platform_fee + result.processing_fee

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
        """Result should contain all PriceBreakdown fields (transfer_fee removed)."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("100.00"),
            shipping_cost=Decimal("10.00"),
            payment_method=PaymentMethodType.CARD,
        )

        assert hasattr(result, "item_price")
        assert hasattr(result, "shipping_cost")
        assert hasattr(result, "platform_fee")
        assert hasattr(result, "processing_fee")
        assert hasattr(result, "total_fees")
        assert hasattr(result, "total_vat")
        assert hasattr(result, "total")
        assert hasattr(result, "seller_payout")
        assert not hasattr(result, "transfer_fee")

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

    def test_total_vat_includes_platform_and_processing(self, pricing_service):
        """Total VAT should include platform VAT + processing VAT (on full fee)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethodType.CARD,
        )

        # Platform VAT: 100 * 7% = 7.00
        # Processing base: 1000*3.65% + 10 = 46.50
        # Processing VAT: 46.50 * 7% = 3.255 -> 3.26 (ROUND_UP)
        # Total VAT: 7.00 + 3.26 = 10.26
        assert result.total_vat == Decimal("10.26")


class TestPlatformFeeWaiver:
    """Tests for the founding-seller platform fee waiver."""

    def test_waived_card_breakdown(self, pricing_service):
        """Waiver zeroes the platform fee (and its VAT); processing fee stays."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethodType.CARD,
            waive_platform_fee=True,
        )

        assert result.platform_fee == Decimal("0.00")
        assert result.processing_fee == Decimal("49.76")
        assert result.total_fees == Decimal("49.76")
        # Only processing VAT remains: 46.50 * 7% -> 3.26
        assert result.total_vat == Decimal("3.26")
        assert result.seller_payout == Decimal("950.24")
        assert result.platform_fee_waived is True

    def test_waived_promptpay_breakdown(self, pricing_service):
        """PromptPay waiver: payout = base - promptpay processing fee."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethodType.PROMPTPAY,
            waive_platform_fee=True,
        )

        assert result.platform_fee == Decimal("0.00")
        # Processing base: 1000*2% + 10 = 30.00; VAT 2.10; total 32.10
        assert result.processing_fee == Decimal("32.10")
        assert result.seller_payout == Decimal("967.90")
        assert result.platform_fee_waived is True

    def test_waiver_does_not_change_buyer_total(self, pricing_service):
        """Buyer pays item + shipping regardless of the waiver."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("100.00"),
            payment_method=PaymentMethodType.CARD,
            waive_platform_fee=True,
        )

        assert result.total == Decimal("1100.00")

    def test_default_is_not_waived(self, pricing_service):
        """Without the flag the standard breakdown is returned."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethodType.CARD,
        )

        assert result.platform_fee == Decimal("107.00")
        assert result.platform_fee_waived is False
