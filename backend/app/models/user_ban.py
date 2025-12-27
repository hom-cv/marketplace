"""User ban model for tracking banned users."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._base import Base


class UserBan(Base):
    """
    User ban model for tracking banned users.

    When a user is banned:
    - They cannot log in or perform any actions
    - Their listings are hidden from the marketplace
    - Ban is permanent until manually lifted by an admin
    """

    __tablename__ = "user_bans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # Banned user
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # Admin who imposed the ban
    banned_by_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
    )

    # Ban details
    reason: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
        index=True,
    )

    # Lift tracking
    lifted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    lifted_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        foreign_keys=[user_id],
        lazy="selectin",
    )
    banned_by: Mapped["User"] = relationship(
        foreign_keys=[banned_by_user_id],
        lazy="selectin",
    )
    lifted_by: Mapped["User | None"] = relationship(
        foreign_keys=[lifted_by_user_id],
        lazy="selectin",
    )
