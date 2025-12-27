"""Seller invite model for controlling seller access via invite codes."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.invite import InviteStatus
from app.models._base import Base


class SellerInvite(Base):
    """
    Seller invite model for controlling marketplace seller access.

    Only users with a valid invite code can register as sellers.
    Invite codes are created by admins only.
    """

    __tablename__ = "seller_invites"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    code: Mapped[str] = mapped_column(
        String(16),
        nullable=False,
        unique=True,
        index=True,
    )
    status: Mapped[InviteStatus] = mapped_column(
        Enum(
            InviteStatus,
            name="invite_status_enum",
            create_constraint=True,
            validate_strings=True,
        ),
        default=InviteStatus.ACTIVE,
        nullable=False,
        index=True,
    )

    # Who created the invite (admin)
    created_by_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Who used the invite (nullable until redeemed)
    used_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    created_by: Mapped["User"] = relationship(
        foreign_keys=[created_by_user_id],
        lazy="selectin",
    )
    used_by: Mapped["User | None"] = relationship(
        foreign_keys=[used_by_user_id],
        lazy="selectin",
    )
