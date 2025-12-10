"""Seller profile model for managing seller verification and payouts."""

from datetime import datetime
from enum import auto

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import AutoName
from app.models._base import Base


class SellerVerificationStatus(AutoName):
    """Seller verification status enumeration."""

    PENDING = auto()  # Verification in progress
    VERIFIED = auto()  # Successfully verified
    REJECTED = auto()  # Verification failed


class SellerProfile(Base):
    """
    Seller profile model for managing seller verification and payouts.

    This model stores Omise recipient information and verification status
    for users who want to sell on the marketplace.
    """

    __tablename__ = "seller_profiles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )

    # Omise recipient information
    omise_recipient_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )

    # Bank account information (stored for display purposes)
    bank_brand: Mapped[str | None] = mapped_column(
        String(64),
        nullable=True,
    )
    bank_account_last_digits: Mapped[str | None] = mapped_column(
        String(4),
        nullable=True,
    )
    bank_account_name: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Verification status
    verification_status: Mapped[SellerVerificationStatus] = mapped_column(
        Enum(
            SellerVerificationStatus,
            name="seller_verification_status_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        default=SellerVerificationStatus.PENDING,
        nullable=False,
    )
    verified_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    rejection_reason: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(back_populates="seller_profile")
