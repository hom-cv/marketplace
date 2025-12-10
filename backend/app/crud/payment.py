"""Payment CRUD operations."""

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud._base import BaseCRUD
from app.models.payment import Payment, PaymentMethod, PaymentStatus
from app.schemas.payment import CreateCardPaymentRequest


class PaymentCRUD(BaseCRUD[Payment, CreateCardPaymentRequest, CreateCardPaymentRequest]):
    """CRUD operations for Payment model."""

    async def get_by_charge_id(
        self, db: AsyncSession, *, charge_id: str
    ) -> Payment | None:
        """
        Retrieve a payment by Omise charge ID.

        Args:
            db (AsyncSession): The asynchronous database session.
            charge_id (str): The Omise charge ID.

        Returns:
            Payment | None: The payment if found, or None.
        """
        query = select(self.model).where(self.model.omise_charge_id == charge_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

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
            .order_by(self.model.created_at.desc())
            .options(selectinload(self.model.post))
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
            .order_by(self.model.created_at.desc())
            .options(selectinload(self.model.post))
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
        omise_charge_id: str | None = None,
        authorize_uri: str | None = None,
        return_uri: str | None = None,
        qr_code_uri: str | None = None,
        expires_at: datetime | None = None,
        description: str | None = None,
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
            omise_charge_id (str | None): Omise charge ID.
            authorize_uri (str | None): 3DS authorization URL.
            return_uri (str | None): Return URL after payment.
            qr_code_uri (str | None): PromptPay QR code URL.
            expires_at (datetime | None): Payment expiration time.
            description (str | None): Payment description.

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
            omise_charge_id=omise_charge_id,
            authorize_uri=authorize_uri,
            return_uri=return_uri,
            qr_code_uri=qr_code_uri,
            expires_at=expires_at,
            description=description,
            status=PaymentStatus.PENDING,
        )

        db.add(payment)
        await db.commit()
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
        elif status == PaymentStatus.FAILED:
            payment.failure_code = failure_code
            payment.failure_message = failure_message

        await db.commit()
        await db.refresh(payment)

        return payment

    async def update_transfer(
        self,
        db: AsyncSession,
        *,
        payment: Payment,
        transfer_id: str,
    ) -> Payment:
        """
        Update the payment with transfer information.

        Args:
            db (AsyncSession): The asynchronous database session.
            payment (Payment): The payment to update.
            transfer_id (str): The Omise transfer ID.

        Returns:
            Payment: The updated payment.
        """
        payment.omise_transfer_id = transfer_id
        payment.transferred_at = datetime.now(timezone.utc)

        await db.commit()
        await db.refresh(payment)

        return payment


payment_crud = PaymentCRUD(Payment)
