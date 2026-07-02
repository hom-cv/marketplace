"""Seller profile model for managing seller verification and payouts."""

from datetime import datetime
from enum import auto

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    text,
)
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

    This model stores the Stripe Connect account reference and verification
    status for users who want to sell on the marketplace. Bank account details
    are managed by Stripe Express and are not stored locally.
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

    # Stripe Connect account
    stripe_account_id: Mapped[str | None] = mapped_column(
        String(255),
        nullable=True,
        unique=True,
    )

    # Stripe account capability flags (mirrored from Account object)
    charges_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    payouts_enabled: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )
    details_submitted: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    # Founding-seller promo: platform-fee-free sales left (granted via invite)
    fee_free_sales_remaining: Mapped[int] = mapped_column(
        Integer,
        default=0,
        server_default=text("0"),
        nullable=False,
    )

    # Verification status
    verification_status: Mapped[SellerVerificationStatus] = mapped_column(
        Enum(
            SellerVerificationStatus,
            native_enum=False,
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
