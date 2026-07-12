"""Unit tests for PricingService.

Tests verify fee calculations, rounding behavior, and payout accuracy.
Fee model: seller pays the 10% platform fee (+VAT); the buyer pays the Stripe
Thailand processing fee (percentage + fixed per-charge THB, +VAT) on top of
item + shipping.
"""

from decimal import Decimal
from unittest.mock import AsyncMock, MagicMock

import pytest

from app.constants.payment import PaymentMethod
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

    def test_buyer_total_is_item_plus_shipping_plus_processing(self, pricing_service):
        """Buyer pays item_price + shipping_cost + processing_fee."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("100.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        assert result.total == Decimal("1100.00") + result.processing_fee

    def test_card_processing_fee_calculation(self, pricing_service):
        """Card processing fee = (amount * 3.65% + 10 THB) + 7% VAT."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        # Grossed up: fee is charged on the full total (base + fee), not base.
        #   fee = 1.07 * (1000*3.65% + 10) / (1 - 3.65%*1.07)
        #       = 49.755 / 0.960945 = 51.777... -> 51.78 (ROUND_UP)
        assert result.processing_fee == Decimal("51.78")

    @pytest.mark.parametrize("method", [PaymentMethod.CARD, PaymentMethod.PROMPTPAY])
    @pytest.mark.parametrize("base", ["100.00", "1000.00", "12345.67"])
    def test_gross_up_leaves_seller_whole(self, pricing_service, method, base):
        """Buyer total minus Stripe's real fee on that total must cover the base.

        The processing fee is grossed up, so after Stripe deducts its fee from
        the full charge the platform is never underwater (margin is a rounding
        cent at most, never negative).
        """
        item_price = Decimal(base)
        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=Decimal("0.00"),
            payment_method=method,
        )

        if method == PaymentMethod.PROMPTPAY:
            rate, fixed = Decimal("2.0"), Decimal("10.0")
        else:
            rate, fixed = Decimal("3.65"), Decimal("10.0")
        # Stripe's actual fee is charged on the FULL total the buyer pays.
        stripe_fee = (result.total * rate / 100 + fixed) * Decimal("1.07")
        margin = result.total - stripe_fee - item_price

        assert margin >= 0  # platform never under-collects
        assert margin < Decimal("0.05")  # ...and only by a rounding cent

    def test_promptpay_processing_fee_lower_than_card(self, pricing_service):
        """PromptPay should have lower processing fee (2% vs 3.65%)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        card_result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )
        promptpay_result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.PROMPTPAY,
        )

        assert promptpay_result.processing_fee < card_result.processing_fee

    def test_fixed_fee_is_added_once_per_charge(self, pricing_service):
        """The fixed per-charge THB fee should be added once, not scaled with amount."""
        small = pricing_service.calculate_order_total(
            item_price=Decimal("100.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethod.CARD,
        )
        big = pricing_service.calculate_order_total(
            item_price=Decimal("10000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethod.CARD,
        )

        # For 100 THB (grossed up): ~15.20. For 10000 THB: ~417.57.
        # The +10 flat is present in both; percentage scales with amount.
        # Small-amount check: the +10 must be included (sanity bounds).
        assert small.processing_fee > Decimal("14.0")
        assert small.processing_fee < Decimal("16.0")
        # Big-amount check: the +10 is only added once (would be ~428 if doubled).
        assert big.processing_fee < Decimal("420.00")

    def test_platform_fee_calculation(self, pricing_service):
        """Platform fee should be 10% + 7% VAT (no separate transfer fee)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        # Platform fee base: 1000 * 10% = 100.00
        # Platform VAT: 100 * 7% = 7.00
        # Total platform: 100.00 + 7.00 = 107.00
        assert result.platform_fee == Decimal("107.00")

    def test_seller_payout_is_base_minus_platform_fee(self, pricing_service):
        """Seller payout = base_amount - platform_fee (processing is buyer-paid)."""
        item_price = Decimal("1000.00")
        shipping_cost = Decimal("100.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        base_amount = item_price + shipping_cost
        assert result.seller_payout == base_amount - result.platform_fee

    def test_split_invariant_total_minus_payout_is_application_fee(self, pricing_service):
        """total - seller_payout must equal the platform application fee.

        This is what Stripe splits at charge time: buyer pays `total`, seller
        receives `seller_payout`, platform keeps `total_fees` (platform +
        processing). If this drifts, the destination charge won't balance.
        """
        result = pricing_service.calculate_order_total(
            item_price=Decimal("777.00"),
            shipping_cost=Decimal("55.00"),
            payment_method=PaymentMethod.CARD,
        )

        assert result.total - result.seller_payout == result.total_fees

    def test_total_fees_equals_platform_plus_processing(self, pricing_service):
        """Total fees = platform_fee + processing_fee (no transfer fee)."""
        item_price = Decimal("500.00")
        shipping_cost = Decimal("50.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        assert result.total_fees == result.platform_fee + result.processing_fee

    def test_zero_shipping_cost(self, pricing_service):
        """Calculations should work with zero shipping cost."""
        item_price = Decimal("100.00")
        shipping_cost = Decimal("0.00")

        result = pricing_service.calculate_order_total(
            item_price=item_price,
            shipping_cost=shipping_cost,
            payment_method=PaymentMethod.CARD,
        )

        assert result.shipping_cost == Decimal("0.00")
        assert result.total == item_price + result.processing_fee

    def test_response_includes_all_required_fields(self, pricing_service):
        """Result should contain all PriceBreakdown fields (transfer_fee removed)."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("100.00"),
            shipping_cost=Decimal("10.00"),
            payment_method=PaymentMethod.CARD,
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
            payment_method=PaymentMethod.CARD,
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
            payment_method=PaymentMethod.CARD,
        )

        # Platform VAT: 100 * 7% = 7.00
        # Processing fee (grossed up): 51.78; its VAT = 51.78 * 7/107 -> 3.39
        # Total VAT: 7.00 + 3.39 = 10.39
        assert result.total_vat == Decimal("10.39")


class TestPlatformFeeWaiver:
    """Tests for the founding-seller platform fee waiver."""

    def test_waived_card_breakdown(self, pricing_service):
        """Waiver zeroes the platform fee; seller gets the full base amount."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethod.CARD,
            waive_platform_fee=True,
        )

        assert result.platform_fee == Decimal("0.00")
        assert result.processing_fee == Decimal("51.78")
        # Platform fee waived, but buyer still pays processing on top of base.
        assert result.total_fees == Decimal("51.78")
        # Only processing VAT remains: 51.78 * 7/107 -> 3.39
        assert result.total_vat == Decimal("3.39")
        assert result.seller_payout == Decimal("1000.00")
        assert result.total == Decimal("1051.78")
        assert result.platform_fee_waived is True

    def test_waived_promptpay_breakdown(self, pricing_service):
        """PromptPay waiver: seller gets full base; buyer still pays processing."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethod.PROMPTPAY,
            waive_platform_fee=True,
        )

        assert result.platform_fee == Decimal("0.00")
        # Grossed up: 1.07*(1000*2% + 10) / (1 - 2%*1.07) = 32.1/0.9786 -> 32.81
        assert result.processing_fee == Decimal("32.81")
        assert result.seller_payout == Decimal("1000.00")
        assert result.total == Decimal("1032.81")
        assert result.platform_fee_waived is True

    def test_waiver_reduces_seller_deduction_not_buyer_total(self, pricing_service):
        """Waiver gives the seller the full base; buyer total is unaffected by it."""
        waived = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("100.00"),
            payment_method=PaymentMethod.CARD,
            waive_platform_fee=True,
        )
        standard = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("100.00"),
            payment_method=PaymentMethod.CARD,
        )

        # Buyer pays the same either way (only the seller's deduction changes).
        assert waived.total == standard.total
        assert waived.seller_payout == Decimal("1100.00")

    def test_default_is_not_waived(self, pricing_service):
        """Without the flag the standard breakdown is returned."""
        result = pricing_service.calculate_order_total(
            item_price=Decimal("1000.00"),
            shipping_cost=Decimal("0.00"),
            payment_method=PaymentMethod.CARD,
        )

        assert result.platform_fee == Decimal("107.00")
        assert result.platform_fee_waived is False
