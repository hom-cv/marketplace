"""Stripe integration constants."""

# Currency handling — Stripe uses lowercase ISO codes.
DEFAULT_CURRENCY = "thb"

# 100 satang = 1 THB. All monetary amounts are stored in satang and passed
# to Stripe in the smallest currency unit.
CURRENCY_SUBUNIT_MULTIPLIER = 100

# Webhook event types that the platform handles.
# Maps Stripe event type strings to logical handler names so the
# payment service can look up the right method.
WEBHOOK_EVENT_HANDLER_MAP: dict[str, str] = {
    "payment_intent.succeeded": "payment_intent_succeeded",
    "payment_intent.payment_failed": "payment_intent_failed",
    "payment_intent.canceled": "payment_intent_failed",
    "charge.refunded": "charge_refunded",
    "account.updated": "account_updated",
}
