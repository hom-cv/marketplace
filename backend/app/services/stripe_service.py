"""Stripe service for interacting with Stripe payment API."""

import logging
from typing import Annotated, Any

import stripe
from fastapi import Depends

from app.core.settings import AnnotatedSettings, Settings

logger = logging.getLogger(__name__)


class StripeService:
    """Service for Stripe API interactions."""

    def __init__(self, settings: Settings) -> None:
        """Initialize a StripeClient with the API key and pinned API version.

        Uses an instance-scoped ``StripeClient`` (no global module config) and
        its native async methods, so network calls are non-blocking on the event
        loop without a thread-pool hop.

        Args:
            settings: Application settings.
        """
        self._settings = settings
        self.client = stripe.StripeClient(
            api_key=self._settings.STRIPE_SECRET_KEY,
            stripe_version=self._settings.STRIPE_API_VERSION,
        )

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
            account = await self.client.v1.accounts.create_async(
                params={
                    "type": "standard",
                    "country": "TH",
                    "email": email,
                },
                options={"idempotency_key": idempotency_key},
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
            link = await self.client.v1.account_links.create_async(
                params={
                    "account": account_id,
                    "return_url": return_url,
                    "refresh_url": refresh_url,
                    "type": link_type,
                },
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
            intent = await self.client.v1.payment_intents.create_async(
                params={
                    "amount": amount,
                    "currency": currency,
                    "payment_method_types": payment_method_types,
                    "transfer_data": {"destination": destination_account_id},
                    "application_fee_amount": application_fee_amount,
                    "metadata": metadata or {},
                    "description": description,
                },
                options={"idempotency_key": idempotency_key},
            )
            logger.info(
                f"Created Stripe PaymentIntent: {intent.id}, status: {intent.status}"
            )
            return intent
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe PaymentIntent: {e}")
            raise

    async def cancel_payment_intent(
        self,
        payment_intent_id: str,
        idempotency_key: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Cancel a PaymentIntent (e.g. a stale PromptPay QR).

        Only intents not yet paid can be cancelled; an intent in
        ``processing``/``succeeded`` raises ``InvalidRequestError`` with code
        ``payment_intent_unexpected_state`` — callers must branch on that
        (the money may have moved).

        Args:
            payment_intent_id: The intent to cancel.
            idempotency_key: Optional idempotency key to safely retry.

        Returns:
            The cancelled Stripe PaymentIntent object.
        """
        try:
            intent = await self.client.v1.payment_intents.cancel_async(
                payment_intent_id,
                options={"idempotency_key": idempotency_key},
            )
            logger.info(f"Cancelled Stripe PaymentIntent: {intent.id}")
            return intent
        except stripe.StripeError as e:
            logger.warning(
                f"Failed to cancel Stripe PaymentIntent {payment_intent_id}: {e}"
            )
            raise

    async def retrieve_payment_intent(
        self, payment_intent_id: str
    ) -> stripe.PaymentIntent:
        """
        Retrieve a PaymentIntent (used to disambiguate a failed cancel).

        Args:
            payment_intent_id: The intent to retrieve.

        Returns:
            The Stripe PaymentIntent object.
        """
        try:
            return await self.client.v1.payment_intents.retrieve_async(
                payment_intent_id
            )
        except stripe.StripeError as e:
            logger.error(
                f"Failed to retrieve Stripe PaymentIntent {payment_intent_id}: {e}"
            )
            raise


def _get_stripe_service(
    settings: AnnotatedSettings,
) -> StripeService:
    """Factory function to create StripeService instance."""
    return StripeService(settings)


AnnotatedStripeService = Annotated[StripeService, Depends(_get_stripe_service)]
