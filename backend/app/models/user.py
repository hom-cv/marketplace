from enum import auto
from typing import TYPE_CHECKING, List

if TYPE_CHECKING:
    from app.models.post import Post

from sqlalchemy import BigInteger, Enum, Index, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import AutoName
from app.models._base import Base
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

    # Relationships
    roles: Mapped[List[UserRole]] = relationship(
        secondary=UserToUserRole.__table__,
        lazy="selectin",  # Optimize for common access pattern
        cascade="all, delete",
        back_populates="users",
    )
    posts: Mapped[List["Post"]] = relationship(
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
    def full_name(self) -> str:
        """Get user's full name."""
        return f"{self.first_name} {self.last_name}"
