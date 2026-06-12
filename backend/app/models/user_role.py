"""User role models for managing authorization levels."""

from enum import auto
from typing import List

from sqlalchemy import BigInteger, ForeignKey
from sqlalchemy import Enum as SqlEnum
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.utils import AutoName
from app.models._base import Base


class RoleType(AutoName):
    """Predefined role types for user authorization."""

    ADMIN = auto()
    USER = auto()
    MODERATOR = auto()


class UserRole(Base):
    """
    User role model for managing authorization levels.

    This model defines the available roles in the system and their permissions.
    Each user can have multiple roles through the UserToUserRole association table.
    """

    __tablename__ = "user_roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    role: Mapped[RoleType] = mapped_column(
        SqlEnum(RoleType, native_enum=True),
        unique=True,
        index=True,
        nullable=False,
    )

    # Relationships
    users: Mapped[List["User"]] = relationship(  # type: ignore # noqa
        secondary="user_to_user_roles", back_populates="roles", lazy="selectin"
    )


class UserToUserRole(Base):
    """
    Association table for the many-to-many relationship between users and roles.

    This model manages the assignment of roles to users, allowing each user
    to have multiple roles and each role to be assigned to multiple users.
    """

    __tablename__ = "user_to_user_roles"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    role_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("user_roles.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )

    __table_args__ = (
        # Prevent duplicate role assignments
        {"info": {"unique_together": [("user_id", "role_id")]}},
    )
