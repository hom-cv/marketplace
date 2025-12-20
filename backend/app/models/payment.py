"""Payment model for tracking marketplace transactions."""

from datetime import datetime
from enum import auto

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Numeric, String, Text
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


class FulfillmentStatus(AutoName):
    """Fulfillment/shipping status enumeration."""

    PACKING = auto()  # Item being prepared, no tracking yet
    IN_TRANSIT = auto()  # Item shipped, tracking number added
    DELIVERED = auto()  # Buyer confirmed receipt


class ShippingCarrier(AutoName):
    """Thai shipping carrier enumeration."""

    EMS = auto()  # Thailand Post EMS
    KEX = auto()  # Kerry Express
    FLASH_EXPRESS = auto()  # Flash Express
    J_AND_T = auto()  # J&T Express


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
    )  # Total amount in smallest currency unit (satang for THB)
    currency: Mapped[str] = mapped_column(
        String(3),
        default="THB",
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )
    
    # Fee breakdown for accounting (all in satang)
    item_price: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    shipping_cost: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    platform_fee: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    processing_fee: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    total_vat: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
    seller_payout: Mapped[int | None] = mapped_column(BigInteger, nullable=True)

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

    # Fulfillment/Shipping status
    fulfillment_status: Mapped[FulfillmentStatus | None] = mapped_column(
        Enum(
            FulfillmentStatus,
            name="fulfillment_status_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        nullable=True,  # Only set after payment is successful
        index=True,
    )
    tracking_number: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    shipping_carrier: Mapped[ShippingCarrier | None] = mapped_column(
        Enum(
            ShippingCarrier,
            name="shipping_carrier_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        nullable=True,
    )
    shipped_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    delivered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Shipping address (provided by buyer during checkout)
    shipping_name: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    shipping_phone: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
    )
    shipping_address: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )
    shipping_district: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    shipping_province: Mapped[str | None] = mapped_column(
        String(100),
        nullable=True,
    )
    shipping_postal_code: Mapped[str | None] = mapped_column(
        String(10),
        nullable=True,
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

    # Foreign keys - RESTRICT prevents deletion of referenced records
    buyer_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seller_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    post_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="RESTRICT"),
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

