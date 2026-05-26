"""Stripe service for interacting with Stripe payment API."""

import functools
import logging
from collections.abc import Callable
from typing import Annotated, Any

import anyio
import stripe
from fastapi import Depends

from app.core.settings import AnnotatedSettings, Settings

logger = logging.getLogger(__name__)


async def _to_thread(func: Callable[..., Any], **kwargs: Any) -> Any:
    """Run a blocking Stripe SDK call in a worker thread.

    Stripe's Python SDK performs synchronous, blocking network I/O. Calling it
    directly from an async handler blocks the event loop, so network calls are
    offloaded to AnyIO's thread pool.
    """
    return await anyio.to_thread.run_sync(functools.partial(func, **kwargs))


class StripeService:
    """Service for Stripe API interactions."""

    def __init__(self, settings: Settings) -> None:
        """Initialize Stripe with API key and pinned API version.

        Args:
            settings: Application settings.
        """
        self._settings = settings
        stripe.api_key = self._settings.STRIPE_SECRET_KEY
        stripe.api_version = self._settings.STRIPE_API_VERSION

    async def create_connect_account(
        self,
        email: str,
        idempotency_key: str | None = None,
    ) -> stripe.Account:
        """
        Create a Stripe Connect Standard account for a seller.

        Args:
            email: Seller email address.
            idempotency_key: Optional idempotency key to safely retry.

        Returns:
            Stripe Account object.
        """
        try:
            account = await _to_thread(
                stripe.Account.create,
                type="standard",
                country="TH",
                email=email,
                idempotency_key=idempotency_key,
            )
            logger.info(f"Created Stripe Connect account: {account.id}")
            return account
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe Connect account: {e}")
            raise

    async def create_account_link(
        self,
        account_id: str,
        return_url: str,
        refresh_url: str,
        link_type: str = "account_onboarding",
    ) -> stripe.AccountLink:
        """
        Create a single-use onboarding or update link for a Connect account.

        Args:
            account_id: Stripe account ID.
            return_url: URL Stripe redirects to after onboarding completes.
            refresh_url: URL Stripe redirects to when the link expires.
            link_type: "account_onboarding" or "account_update".

        Returns:
            Stripe AccountLink object with a short-lived URL.
        """
        try:
            link = await _to_thread(
                stripe.AccountLink.create,
                account=account_id,
                return_url=return_url,
                refresh_url=refresh_url,
                type=link_type,
            )
            logger.info(f"Created Stripe account link for {account_id}")
            return link
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe account link: {e}")
            raise

    async def create_payment_intent(
        self,
        amount: int,
        currency: str,
        payment_method_types: list[str],
        destination_account_id: str,
        application_fee_amount: int,
        metadata: dict[str, Any] | None = None,
        description: str | None = None,
        idempotency_key: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Create a Stripe PaymentIntent as a destination charge.

        Funds route directly to the connected account; `application_fee_amount`
        stays on the platform balance.

        Args:
            amount: Amount in smallest currency unit (satang for THB).
            currency: Currency code (e.g., 'thb').
            payment_method_types: List of allowed payment method types
                (e.g., ['card'], ['promptpay']).
            destination_account_id: Connected seller account to route funds to.
            application_fee_amount: Platform's cut, in the smallest currency unit.
            metadata: Optional metadata to attach to the intent.
            description: Optional human-readable description.
            idempotency_key: Optional idempotency key to safely retry.

        Returns:
            Stripe PaymentIntent object.
        """
        try:
            intent = await _to_thread(
                stripe.PaymentIntent.create,
                amount=amount,
                currency=currency,
                payment_method_types=payment_method_types,
                transfer_data={"destination": destination_account_id},
                application_fee_amount=application_fee_amount,
                metadata=metadata or {},
                description=description,
                idempotency_key=idempotency_key,
            )
            logger.info(
                f"Created Stripe PaymentIntent: {intent.id}, status: {intent.status}"
            )
            return intent
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe PaymentIntent: {e}")
            raise

    def construct_event(
        self,
        payload: bytes,
        sig_header: str,
        secret: str,
    ) -> stripe.Event:
        """
        Verify a Stripe webhook signature and construct the Event object.

        Args:
            payload: Raw request body bytes.
            sig_header: Value of the `Stripe-Signature` header.
            secret: Stripe webhook signing secret.

        Returns:
            Stripe Event object.

        Raises:
            ValueError: If the payload cannot be parsed.
            stripe.SignatureVerificationError: If the signature is invalid.
        """
        return stripe.Webhook.construct_event(payload, sig_header, secret)


def _get_stripe_service(
    settings: AnnotatedSettings,
) -> StripeService:
    """Factory function to create StripeService instance."""
    return StripeService(settings)


AnnotatedStripeService = Annotated[StripeService, Depends(_get_stripe_service)]
