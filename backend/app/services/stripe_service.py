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
        """Initialize Stripe with API key and pinned API version.

        Args:
            settings: Application settings.
        """
        self._settings = settings
        stripe.api_key = self._settings.STRIPE_SECRET_KEY
        stripe.api_version = self._settings.STRIPE_API_VERSION

    def create_express_account(
        self,
        email: str,
        idempotency_key: str | None = None,
    ) -> stripe.Account:
        """
        Create a Stripe Connect Express account for a seller.

        Args:
            email: Seller email address.
            idempotency_key: Optional idempotency key to safely retry.

        Returns:
            Stripe Account object.
        """
        try:
            account = stripe.Account.create(
                type="express",
                country="TH",
                email=email,
                capabilities={
                    "card_payments": {"requested": True},
                    "transfers": {"requested": True},
                    "promptpay_payments": {"requested": True},
                },
                idempotency_key=idempotency_key,
            )
            logger.info(f"Created Stripe Express account: {account.id}")
            return account
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe Express account: {e}")
            raise

    def create_account_link(
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
            link = stripe.AccountLink.create(
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

    def create_dashboard_login_link(self, account_id: str) -> stripe.LoginLink:
        """
        Create a login link to the Stripe Express Dashboard for a verified seller.

        Args:
            account_id: Stripe account ID.

        Returns:
            Stripe LoginLink object.
        """
        try:
            return stripe.Account.create_login_link(account_id)
        except stripe.StripeError as e:
            logger.error(
                f"Failed to create Stripe dashboard login link for {account_id}: {e}"
            )
            raise

    def retrieve_account(self, account_id: str) -> stripe.Account:
        """
        Retrieve a Stripe Connect account by ID.

        Args:
            account_id: Stripe account ID.

        Returns:
            Stripe Account object.
        """
        try:
            return stripe.Account.retrieve(account_id)
        except stripe.StripeError as e:
            logger.error(f"Failed to retrieve Stripe account {account_id}: {e}")
            raise

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        payment_method_types: list[str],
        metadata: dict[str, Any] | None = None,
        description: str | None = None,
        transfer_group: str | None = None,
        idempotency_key: str | None = None,
    ) -> stripe.PaymentIntent:
        """
        Create a Stripe PaymentIntent.

        Args:
            amount: Amount in smallest currency unit (satang for THB).
            currency: Currency code (e.g., 'thb').
            payment_method_types: List of allowed payment method types
                (e.g., ['card'], ['promptpay']).
            metadata: Optional metadata to attach to the intent.
            description: Optional human-readable description.
            transfer_group: Optional transfer group used to link later transfers.
            idempotency_key: Optional idempotency key to safely retry.

        Returns:
            Stripe PaymentIntent object.
        """
        try:
            intent = stripe.PaymentIntent.create(
                amount=amount,
                currency=currency,
                payment_method_types=payment_method_types,
                metadata=metadata or {},
                description=description,
                transfer_group=transfer_group,
                idempotency_key=idempotency_key,
            )
            logger.info(
                f"Created Stripe PaymentIntent: {intent.id}, status: {intent.status}"
            )
            return intent
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe PaymentIntent: {e}")
            raise

    def retrieve_payment_intent(self, payment_intent_id: str) -> stripe.PaymentIntent:
        """
        Retrieve a PaymentIntent with charge and next_action data expanded.

        Args:
            payment_intent_id: Stripe PaymentIntent ID.

        Returns:
            Stripe PaymentIntent object with expanded fields.
        """
        try:
            return stripe.PaymentIntent.retrieve(
                payment_intent_id,
                expand=["latest_charge", "next_action"],
            )
        except stripe.StripeError as e:
            logger.error(
                f"Failed to retrieve Stripe PaymentIntent {payment_intent_id}: {e}"
            )
            raise

    def create_transfer(
        self,
        amount: int,
        destination_account_id: str,
        currency: str = "thb",
        metadata: dict[str, Any] | None = None,
        transfer_group: str | None = None,
        idempotency_key: str | None = None,
    ) -> stripe.Transfer:
        """
        Create a Stripe transfer from the platform balance to a connected account.

        Args:
            amount: Amount in smallest currency unit (satang for THB).
            destination_account_id: Connected account ID to transfer to.
            currency: Currency code (default 'thb').
            metadata: Optional metadata to attach to the transfer.
            transfer_group: Optional transfer group, used to link charges to payouts.
            idempotency_key: Optional idempotency key for safe retry.

        Returns:
            Stripe Transfer object.
        """
        try:
            transfer = stripe.Transfer.create(
                amount=amount,
                currency=currency,
                destination=destination_account_id,
                metadata=metadata or {},
                transfer_group=transfer_group,
                idempotency_key=idempotency_key,
            )
            logger.info(f"Created Stripe transfer: {transfer.id}")
            return transfer
        except stripe.StripeError as e:
            logger.error(f"Failed to create Stripe transfer: {e}")
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
