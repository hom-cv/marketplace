"""Stripe integration constants."""

# Currency handling — Stripe uses lowercase ISO codes.
DEFAULT_CURRENCY = "thb"

# 100 satang = 1 THB. All monetary amounts are stored in satang and passed
# to Stripe in the smallest currency unit.
CURRENCY_SUBUNIT_MULTIPLIER = 100

# Webhook event types that the platform handles. Each map drives one webhook
# endpoint and is verified with its own signing secret. The maps are kept
# separate because the two event streams arrive on different Stripe accounts:
#
#   - Platform account: our charges are destination charges (transfer_data +
#     application_fee), so the PaymentIntent lives on the platform account and
#     these events fire there. Endpoint scope in the Dashboard: "Your account".
#   - Connect: account.* events describe connected seller accounts and are only
#     delivered on the Connect stream. Endpoint scope: "Connected accounts".
#
# Maps Stripe event type strings to logical handler names so the webhook
# service can look up the right method.
ACCOUNT_WEBHOOK_EVENT_HANDLER_MAP: dict[str, str] = {
    "payment_intent.succeeded": "payment_intent_succeeded",
    "payment_intent.payment_failed": "payment_intent_failed",
    "payment_intent.canceled": "payment_intent_failed",
    "charge.refunded": "charge_refunded",
    "charge.dispute.created": "charge_dispute_created",
    "charge.dispute.closed": "charge_dispute_closed",
}

CONNECT_WEBHOOK_EVENT_HANDLER_MAP: dict[str, str] = {
    "account.updated": "account_updated",
    "account.application.deauthorized": "account_deauthorized",
}
