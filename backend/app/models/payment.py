"""Payment model for tracking marketplace transactions."""

from datetime import datetime
from enum import auto

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import AutoName
from app.models._base import Base


class PaymentStatus(AutoName):
    """Payment status enumeration."""

    PENDING = auto()  # Payment initiated, awaiting processing
    AUTHORIZED = auto()  # Card authorized, awaiting capture (for 3DS)
    SUCCESSFUL = auto()  # Payment completed successfully
    FAILED = auto()  # Payment failed
    REFUNDED = auto()  # Payment was refunded
    EXPIRED = auto()  # Payment expired (e.g., PromptPay QR)


class PaymentMethod(AutoName):
    """Payment method enumeration."""

    CARD = auto()  # Credit/Debit card
    PROMPTPAY = auto()  # Thai PromptPay QR


class Payment(Base):
    """
    Payment model for tracking marketplace transactions.

    This model stores payment information including Omise charge details,
    buyer/seller information, and transaction status.
    """

    __tablename__ = "payments"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # Omise identifiers
    omise_charge_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
        index=True,
    )
    omise_transfer_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )

    # Transaction details
    amount: Mapped[int] = mapped_column(
        BigInteger,
        nullable=False,
    )  # Amount in smallest currency unit (satang for THB)
    currency: Mapped[str] = mapped_column(
        String(3),
        default="THB",
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Payment method and status
    payment_method: Mapped[PaymentMethod] = mapped_column(
        Enum(
            PaymentMethod,
            name="payment_method_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        default=PaymentMethod.CARD,
        nullable=False,
    )
    status: Mapped[PaymentStatus] = mapped_column(
        Enum(
            PaymentStatus,
            name="payment_status_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        default=PaymentStatus.PENDING,
        nullable=False,
        index=True,
    )

    # 3DS authorization
    authorize_uri: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    return_uri: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )

    # PromptPay specific
    qr_code_uri: Mapped[str | None] = mapped_column(
        String(512),
        nullable=True,
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Foreign keys
    buyer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Timestamps
    paid_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    transferred_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Failure information
    failure_code: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    failure_message: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    buyer: Mapped["User"] = relationship(
        back_populates="purchases",
        foreign_keys=[buyer_id],
    )
    seller: Mapped["User"] = relationship(
        back_populates="sales",
        foreign_keys=[seller_id],
    )
    post: Mapped["Post"] = relationship(back_populates="payments")
