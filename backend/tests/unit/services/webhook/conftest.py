"""Fixtures and Stripe-object builders for webhook handler tests.

Stripe resource objects are built via ``construct_from`` so they behave exactly
like production payloads: attribute access (``intent.id``, ``last_error.code``)
and dict access (``metadata.get(...)``) both work, and missing optional fields
are present-as-None rather than raising.
"""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
import stripe

from app.models.payment import PaymentStatus
from app.models.seller import SellerVerificationStatus
from app.services.stripe_webhook_service import StripeWebhookService

# --- Stripe fake-object builders -------------------------------------------

def make_payment_intent(*, id="pi_123", metadata=None, last_payment_error=None):
    return stripe.PaymentIntent.construct_from(
        {
            "id": id,
            "metadata": metadata or {},
            "last_payment_error": last_payment_error,
        },
        key=None,
    )


def make_charge(*, id="ch_1", payment_intent="pi_123"):
    return stripe.Charge.construct_from(
        {"id": id, "payment_intent": payment_intent}, key=None
    )


def make_dispute(*, id="dp_1", payment_intent="pi_123", charge="ch_1", status="lost"):
    return stripe.Dispute.construct_from(
        {
            "id": id,
            "payment_intent": payment_intent,
            "charge": charge,
            "status": status,
        },
        key=None,
    )


def make_account(
    *,
    id="acct_1",
    charges_enabled=True,
    payouts_enabled=True,
    details_submitted=True,
    disabled_reason=None,
):
    return stripe.Account.construct_from(
        {
            "id": id,
            "charges_enabled": charges_enabled,
            "payouts_enabled": payouts_enabled,
            "details_submitted": details_submitted,
            "requirements": {"disabled_reason": disabled_reason},
        },
        key=None,
    )


def make_event(*, type, data_object=None, account=None):
    return stripe.Event.construct_from(
        {"type": type, "account": account, "data": {"object": data_object or {}}},
        key=None,
    )


# --- DB row stand-ins ------------------------------------------------------

def make_payment(
    *,
    id=1,
    status=PaymentStatus.PENDING,
    stripe_payment_intent_id="pi_123",
    seller_id=10,
    platform_fee_waived=False,
):
    payment = MagicMock()
    payment.id = id
    payment.status = status
    payment.stripe_payment_intent_id = stripe_payment_intent_id
    payment.seller_id = seller_id
    payment.platform_fee_waived = platform_fee_waived
    return payment


def make_seller_profile(
    *,
    user_id=10,
    verification_status=SellerVerificationStatus.PENDING,
    charges_enabled=False,
    payouts_enabled=False,
    details_submitted=False,
):
    profile = MagicMock()
    profile.user_id = user_id
    profile.verification_status = verification_status
    profile.charges_enabled = charges_enabled
    profile.payouts_enabled = payouts_enabled
    profile.details_submitted = details_submitted
    return profile


@pytest.fixture
def mocks(monkeypatch):
    """Patch the module-level CRUD singletons with AsyncMock-backed mocks."""
    import app.services.stripe_webhook_service as mod

    payment_crud = SimpleNamespace(
        get_by_payment_intent_id_for_update=AsyncMock(return_value=None),
        update_status=AsyncMock(),
        restore_to_successful=AsyncMock(),
    )
    seller_crud = SimpleNamespace(
        get_by_stripe_account_id_for_update=AsyncMock(return_value=None),
        update_account_status=AsyncMock(),
        update_verification_status=AsyncMock(),
        decrement_fee_free_sales=AsyncMock(),
    )
    monkeypatch.setattr(mod, "payment_crud", payment_crud)
    monkeypatch.setattr(mod, "seller_crud", seller_crud)

    return SimpleNamespace(payment_crud=payment_crud, seller_crud=seller_crud)


@pytest.fixture
def service():
    """A webhook service with an AsyncMock session (tracks commit/flush awaits)."""
    return StripeWebhookService(db=AsyncMock())
