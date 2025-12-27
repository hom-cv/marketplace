"""Post ban model for tracking banned listings."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._base import Base


class PostBan(Base):
    """
    Post ban model for tracking banned listings.

    When a post is banned:
    - It is hidden from the marketplace
    - It cannot be purchased
    - Ban is permanent until manually lifted by an admin
    """

    __tablename__ = "post_bans"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # Banned post
    post_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="CASCADE"),
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
    post: Mapped["Post"] = relationship(
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
