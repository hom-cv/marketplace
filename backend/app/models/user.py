"""User model for application users and their relationships."""

from datetime import datetime
from enum import auto
from typing import List, Optional

from sqlalchemy import BigInteger, Enum, Index, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import AutoName
from app.models._base import Base
from app.models.seller import SellerVerificationStatus
from app.models.user_role import RoleType, UserRole, UserToUserRole


class UserStatus(AutoName):
    """User account status enumeration."""

    PENDING = auto()  # New account, email not verified
    ACTIVE = auto()  # Active account with verified email


class User(Base):
    """
    User model representing application users.

    This model stores core user information and manages relationships
    with roles, listings, addresses, and payment recipients.
    """

    __tablename__ = "users"

    # Primary fields
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    username: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )
    first_name: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    last_name: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
    )
    email_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        unique=True,
        index=True,
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )
    email_verified: Mapped[bool] = mapped_column(
        default=False,
        nullable=False,
    )
    status: Mapped[UserStatus] = mapped_column(
        Enum(
            UserStatus,
            name="user_status_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        default=UserStatus.PENDING,
        nullable=False,
    )

    # Profile fields
    bio: Mapped[str | None] = mapped_column(Text, nullable=True, default=None)
    show_full_name: Mapped[bool] = mapped_column(default=True, nullable=False)

    # Relationships
    roles: Mapped[List[UserRole]] = relationship(
        secondary=UserToUserRole.__table__,
        lazy="selectin",  # Optimize for common access pattern
        cascade="all, delete",
        back_populates="users",
    )
    posts: Mapped[List["Post"]] = relationship(
        back_populates="user",
        # No cascade - preserve posts for accounting
    )
    seller_profile: Mapped[Optional["SellerProfile"]] = relationship(
        back_populates="user",
        cascade="all, delete-orphan",
        uselist=False,
    )
    purchases: Mapped[List["Payment"]] = relationship(
        back_populates="buyer",
        foreign_keys="Payment.buyer_id",
        # No cascade - preserve payment records for accounting
    )
    sales: Mapped[List["Payment"]] = relationship(
        back_populates="seller",
        foreign_keys="Payment.seller_id",
        # No cascade - preserve payment records for accounting
    )
    likes: Mapped[List["Like"]] = relationship(  # type: ignore # noqa
        back_populates="user",
        cascade="all, delete-orphan",
    )

    # Indexes
    __table_args__ = (
        Index("ix_users_name", first_name, last_name),  # Optimize name searches
    )

    @property
    def is_active(self) -> bool:
        """Check if the user account is active."""
        return self.status == UserStatus.ACTIVE

    @property
    def is_admin(self) -> bool:
        """Check if the user has admin role."""
        if self.roles:
            return any(r.role == RoleType.ADMIN for r in self.roles)
        return False

    @property
    def is_seller(self) -> bool:
        """Check if the user is a verified seller."""
        if self.seller_profile:
            return (
                self.seller_profile.verification_status
                == SellerVerificationStatus.VERIFIED
            )
        return False

    @property
    def full_name(self) -> str:
        """Get user's full name (last name is optional)."""
        return f"{self.first_name} {self.last_name}".strip()

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(
        nullable=True,
        default=None,
        index=True,
    )

    @property
    def is_deleted(self) -> bool:
        """Check if user has been soft deleted."""
        return self.deleted_at is not None
