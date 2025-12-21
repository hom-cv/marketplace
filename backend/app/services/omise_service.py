"""Omise service for interacting with Omise payment API."""

import logging
from typing import Any

import omise

from app.core.settings import Settings, get_settings

logger = logging.getLogger(__name__)


class OmiseService:
    """Service for Omise API interactions."""

    def __init__(self, settings: Settings | None = None) -> None:
        """Initialize Omise with API keys.

        Args:
            settings: Application settings. If None, defaults are loaded via get_settings().
        """
        self._settings = settings or get_settings()
        omise.api_secret = self._settings.OMISE_SECRET_KEY
        omise.api_public = self._settings.OMISE_PUBLIC_KEY

    def create_recipient(
        self,
        name: str,
        email: str,
        bank_brand: str,
        bank_account_number: str,
        bank_account_name: str,
        recipient_type: str = "individual",
    ) -> omise.Recipient:
        """
        Create an Omise recipient for payouts.

        Args:
            name: Recipient name
            email: Recipient email
            bank_brand: Bank brand code (e.g., 'kbank', 'bbl')
            bank_account_number: Bank account number
            bank_account_name: Name on bank account
            recipient_type: Type of recipient ('individual' or 'corporation')

        Returns:
            Omise Recipient object
        """
        try:
            recipient = omise.Recipient.create(
                name=name,
                email=email,
                type=recipient_type,
                bank_account={
                    "brand": bank_brand,
                    "number": bank_account_number,
                    "name": bank_account_name,
                },
            )
            logger.info(f"Created Omise recipient: {recipient.id}")
            return recipient
        except omise.errors.BaseError as e:
            logger.error(f"Failed to create Omise recipient: {e}")
            raise

    def get_recipient(self, recipient_id: str) -> omise.Recipient:
        """
        Retrieve an Omise recipient by ID.

        Args:
            recipient_id: Omise recipient ID

        Returns:
            Omise Recipient object
        """
        try:
            return omise.Recipient.retrieve(recipient_id)
        except omise.errors.BaseError as e:
            logger.error(f"Failed to retrieve Omise recipient {recipient_id}: {e}")
            raise

    def create_charge(
        self,
        amount: int,
        currency: str,
        card_token: str,
        description: str | None = None,
        return_uri: str | None = None,
        metadata: dict[str, Any] | None = None,
        platform_fee: int | None = None,
    ) -> omise.Charge:
        """
        Create an Omise charge for card payment.

        Args:
            amount: Amount in smallest currency unit (satang for THB)
            currency: Currency code (e.g., 'THB')
            card_token: Omise card token from frontend
            description: Optional charge description
            return_uri: URL to redirect after 3DS authentication
            metadata: Optional metadata to attach to charge
            platform_fee: Platform fee in satang (for Omise Connect)

        Returns:
            Omise Charge object
        """
        try:
            charge_params = {
                "amount": amount,
                "currency": currency,
                "card": card_token,
                "description": description,
                "return_uri": return_uri,
                "metadata": metadata or {},
            }
            # Add platform_fee for Omise Connect if specified
            if platform_fee is not None:
                charge_params["platform_fee"] = {"fixed": platform_fee}

            charge = omise.Charge.create(**charge_params)
            logger.info(f"Created Omise charge: {charge.id}, status: {charge.status}")
            return charge
        except omise.errors.BaseError as e:
            logger.error(f"Failed to create Omise charge: {e}")
            raise

    def create_promptpay_source(
        self,
        amount: int,
        currency: str = "THB",
    ) -> omise.Source:
        """
        Create an Omise source for PromptPay payment.

        Args:
            amount: Amount in smallest currency unit (satang for THB)
            currency: Currency code (default: 'THB')

        Returns:
            Omise Source object with QR code
        """
        try:
            source = omise.Source.create(
                amount=amount,
                currency=currency,
                type="promptpay",
            )
            logger.info(f"Created PromptPay source: {source.id}")
            return source
        except omise.errors.BaseError as e:
            logger.error(f"Failed to create PromptPay source: {e}")
            raise

    def create_charge_with_source(
        self,
        amount: int,
        currency: str,
        source_id: str,
        description: str | None = None,
        return_uri: str | None = None,
        metadata: dict[str, Any] | None = None,
        platform_fee: int | None = None,
    ) -> omise.Charge:
        """
        Create an Omise charge using a source (PromptPay, etc.).

        Args:
            amount: Amount in smallest currency unit
            currency: Currency code
            source_id: Omise source ID
            description: Optional charge description
            return_uri: URL to redirect after payment
            metadata: Optional metadata
            platform_fee: Platform fee in satang (for Omise Connect)

        Returns:
            Omise Charge object
        """
        try:
            charge_params = {
                "amount": amount,
                "currency": currency,
                "source": source_id,
                "description": description,
                "return_uri": return_uri,
                "metadata": metadata or {},
            }
            # Add platform_fee for Omise Connect if specified
            if platform_fee is not None:
                charge_params["platform_fee"] = {"fixed": platform_fee}

            charge = omise.Charge.create(**charge_params)
            logger.info(f"Created Omise charge with source: {charge.id}")
            return charge
        except omise.errors.BaseError as e:
            logger.error(f"Failed to create Omise charge with source: {e}")
            raise

    def get_charge(self, charge_id: str) -> omise.Charge:
        """
        Retrieve an Omise charge by ID.

        Args:
            charge_id: Omise charge ID

        Returns:
            Omise Charge object
        """
        try:
            return omise.Charge.retrieve(charge_id)
        except omise.errors.BaseError as e:
            logger.error(f"Failed to retrieve Omise charge {charge_id}: {e}")
            raise

    def create_transfer(
        self,
        amount: int,
        recipient_id: str,
        metadata: dict[str, Any] | None = None,
    ) -> omise.Transfer:
        """
        Create an Omise transfer to a recipient.

        Args:
            amount: Amount in smallest currency unit
            recipient_id: Omise recipient ID to transfer to
            metadata: Optional metadata

        Returns:
            Omise Transfer object
        """
        try:
            transfer = omise.Transfer.create(
                amount=amount,
                recipient=recipient_id,
                metadata=metadata or {},
            )
            logger.info(f"Created Omise transfer: {transfer.id}")
            return transfer
        except omise.errors.BaseError as e:
            logger.error(f"Failed to create Omise transfer: {e}")
            raise


def get_omise_service(settings: Settings | None = None) -> OmiseService:
    """Factory function to create OmiseService instance.

    Args:
        settings: Optional settings to inject. Uses get_settings() if not provided.

    Returns:
        OmiseService instance.
    """
    return OmiseService(settings)
