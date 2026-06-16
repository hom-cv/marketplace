"""Payment CRUD operations."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.exceptions import invalid_carrier_error
from app.crud._base import BaseCRUD
from app.models.payment import (
    FulfillmentStatus,
    Payment,
    PaymentMethod,
    PaymentStatus,
    ShippingCarrier,
)
from app.schemas.payment import CreateCardPaymentRequest


class PaymentCRUD(
    BaseCRUD[Payment, CreateCardPaymentRequest, CreateCardPaymentRequest]
):
    """CRUD operations for Payment model."""

    async def get_by_payment_intent_id_for_update(
        self, db: AsyncSession, *, payment_intent_id: str
    ) -> Payment | None:
        """
        Retrieve a payment by Stripe PaymentIntent ID with a row-level lock.

        Use in webhook check-then-update paths to serialize concurrent
        redeliveries of the same event and prevent lost updates. The lock is
        held until the surrounding transaction commits, so the caller must not
        commit before completing its update.
        """
        query = (
            select(self.model)
            .where(self.model.stripe_payment_intent_id == payment_intent_id)
            .with_for_update()
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_for_update(
        self, db: AsyncSession, *, id: int
    ) -> Payment | None:
        """
        Retrieve a payment by ID with a row-level lock.
        """
        query = (
            select(self.model).where(self.model.id == id).with_for_update()
        )
        result = await db.execute(query)

        return result.scalar_one_or_none()

    async def exists_successful_for_post(
        self, db: AsyncSession, *, post_id: int, exclude_payment_id: int
    ) -> bool:
        """
        Check whether another payment already successfully bought this post.
        """
        query = select(
            select(self.model.id)
            .where(self.model.post_id == post_id)
            .where(self.model.status == PaymentStatus.SUCCESSFUL)
            .where(self.model.id != exclude_payment_id)
            .exists()
        )
        result = await db.scalar(query)

        return bool(result)

    async def get_pending_with_intent_by_post(
        self, db: AsyncSession, *, post_id: int, exclude_payment_id: int
    ) -> list[Payment]:
        """
        Get other PENDING payments (with a Stripe intent) for a post.
        """
        query = (
            select(self.model)
            .where(self.model.post_id == post_id)
            .where(self.model.status == PaymentStatus.PENDING)
            .where(self.model.stripe_payment_intent_id.is_not(None))
            .where(self.model.id != exclude_payment_id)
        )
        result = await db.scalars(query)

        return list(result.all())

    async def get_payments_by_buyer(
        self, db: AsyncSession, *, buyer_id: int
    ) -> list[Payment]:
        """
        Retrieve all payments made by a buyer.

        Args:
            db (AsyncSession): The asynchronous database session.
            buyer_id (int): The buyer's user ID.

        Returns:
            list[Payment]: List of payments.
        """
        query = (
            select(self.model)
            .where(self.model.buyer_id == buyer_id)
            .order_by(self.model.created_date.desc())
            .options(
                selectinload(self.model.post),
                selectinload(self.model.seller),
            )
        )
        result = await db.scalars(query)
        return list(result.all())

    async def get_payments_by_seller(
        self, db: AsyncSession, *, seller_id: int
    ) -> list[Payment]:
        """
        Retrieve all payments received by a seller.

        Args:
            db (AsyncSession): The asynchronous database session.
            seller_id (int): The seller's user ID.

        Returns:
            list[Payment]: List of payments.
        """
        query = (
            select(self.model)
            .where(self.model.seller_id == seller_id)
            .order_by(self.model.created_date.desc())
            .options(
                selectinload(self.model.post),
                selectinload(self.model.buyer),
            )
        )
        result = await db.scalars(query)
        return list(result.all())

    async def create_payment(
        self,
        db: AsyncSession,
        *,
        buyer_id: int,
        seller_id: int,
        post_id: int,
        amount: int,
        currency: str,
        payment_method: PaymentMethod,
        stripe_payment_intent_id: str | None = None,
        description: str | None = None,
        # Fee breakdown (all in satang)
        item_price: int | None = None,
        shipping_cost: int | None = None,
        platform_fee: int | None = None,
        processing_fee: int | None = None,
        total_vat: int | None = None,
        seller_payout: int | None = None,
        platform_fee_waived: bool = False,
        # Shipping address
        shipping_name: str | None = None,
        shipping_phone: str | None = None,
        shipping_address: str | None = None,
        shipping_district: str | None = None,
        shipping_province: str | None = None,
        shipping_postal_code: str | None = None,
    ) -> Payment:
        """
        Create a new payment record.

        Args:
            db (AsyncSession): The asynchronous database session.
            buyer_id (int): The buyer's user ID.
            seller_id (int): The seller's user ID.
            post_id (int): The post ID being purchased.
            amount (int): Amount in smallest currency unit.
            currency (str): Currency code.
            payment_method (PaymentMethod): Payment method used.
            stripe_payment_intent_id (str | None): Stripe PaymentIntent ID.
            description (str | None): Payment description.
            Fee breakdown fields: item_price, shipping_cost, platform_fee, processing_fee, total_vat, seller_payout.
            shipping_*: Shipping address fields.

        Returns:
            Payment: The created payment.
        """
        payment = Payment(
            buyer_id=buyer_id,
            seller_id=seller_id,
            post_id=post_id,
            amount=amount,
            currency=currency,
            payment_method=payment_method,
            stripe_payment_intent_id=stripe_payment_intent_id,
            description=description,
            status=PaymentStatus.PENDING,
            # Fee breakdown
            item_price=item_price,
            shipping_cost=shipping_cost,
            platform_fee=platform_fee,
            processing_fee=processing_fee,
            total_vat=total_vat,
            seller_payout=seller_payout,
            platform_fee_waived=platform_fee_waived,
            # Shipping address
            shipping_name=shipping_name,
            shipping_phone=shipping_phone,
            shipping_address=shipping_address,
            shipping_district=shipping_district,
            shipping_province=shipping_province,
            shipping_postal_code=shipping_postal_code,
        )

        db.add(payment)

        await db.flush()
        await db.refresh(payment)

        return payment

    async def update_status(
        self,
        db: AsyncSession,
        *,
        payment: Payment,
        status: PaymentStatus,
        failure_code: str | None = None,
        failure_message: str | None = None,
    ) -> Payment:
        """
        Update the status of a payment.

        Args:
            db (AsyncSession): The asynchronous database session.
            payment (Payment): The payment to update.
            status (PaymentStatus): The new status.
            failure_code (str | None): Failure code if applicable.
            failure_message (str | None): Failure message if applicable.

        Returns:
            Payment: The updated payment.
        """
        payment.status = status

        if status == PaymentStatus.SUCCESSFUL:
            payment.paid_at = datetime.now(timezone.utc)
            # Set initial fulfillment status to PACKING
            payment.fulfillment_status = FulfillmentStatus.PACKING
        elif status == PaymentStatus.FAILED:
            payment.failure_code = failure_code
            payment.failure_message = failure_message

        await db.flush()
        await db.refresh(payment)

        return payment

    async def restore_to_successful(
        self, db: AsyncSession, *, payment: Payment
    ) -> Payment:
        """
        Set a payment back to SUCCESSFUL without touching paid_at/fulfillment.

        Used when a dispute is resolved in the seller's favor (won): the payment
        was moved to DISPUTED but the order may already have shipped, so we must
        not re-stamp paid_at or reset fulfillment_status to PACKING the way
        ``update_status`` does.
        """
        payment.status = PaymentStatus.SUCCESSFUL

        await db.flush()
        await db.refresh(payment)

        return payment

    async def add_tracking_number(
        self,
        db: AsyncSession,
        *,
        payment: Payment,
        tracking_number: str,
        carrier: str,
    ) -> Payment:
        """
        Add tracking number to a payment (seller action).

        Sets fulfillment_status to IN_TRANSIT and records shipped_at timestamp.

        Args:
            db (AsyncSession): The asynchronous database session.
            payment (Payment): The payment to update.
            tracking_number (str): The shipping tracking number.
            carrier (str): The shipping carrier (EMS, KEX, FLASH_EXPRESS, J_AND_T).

        Returns:
            Payment: The updated payment.
        """
        try:
            payment.tracking_number = tracking_number
            payment.shipping_carrier = ShippingCarrier[carrier.upper()]
            payment.fulfillment_status = FulfillmentStatus.IN_TRANSIT
            payment.shipped_at = datetime.now(timezone.utc)
        except KeyError:
            raise invalid_carrier_error(carrier)

        await db.flush()
        await db.refresh(payment)

        return payment

    async def confirm_delivery(
        self,
        db: AsyncSession,
        *,
        payment: Payment,
    ) -> Payment:
        """
        Confirm delivery of an item (buyer action).

        Sets fulfillment_status to DELIVERED and records delivered_at timestamp.

        Args:
            db (AsyncSession): The asynchronous database session.
            payment (Payment): The payment to update.

        Returns:
            Payment: The updated payment.
        """
        payment.fulfillment_status = FulfillmentStatus.DELIVERED
        payment.delivered_at = datetime.now(timezone.utc)

        await db.flush()
        await db.refresh(payment)

        return payment


payment_crud = PaymentCRUD(Payment)


def get_payment_crud() -> PaymentCRUD:
    """Dependency provider for PaymentCRUD instance."""
    return payment_crud
