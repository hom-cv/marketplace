"""Omise payment gateway constants."""

# Currency configuration
DEFAULT_CURRENCY = "THB"
CURRENCY_SUBUNIT_MULTIPLIER = 100  # 1 THB = 100 satang


class ChargeStatus:
    """Omise charge status constants."""

    SUCCESSFUL = "successful"
    FAILED = "failed"
    EXPIRED = "expired"
    PENDING = "pending"


class EventKey:
    """Omise webhook event key constants."""

    CHARGE_COMPLETE = "charge.complete"
    TRANSFER_PAY = "transfer.pay"
    RECIPIENT_VERIFY = "recipient.verify"
