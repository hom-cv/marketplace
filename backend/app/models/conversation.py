"""Conversation model for listing-linked chat."""

from __future__ import annotations

from typing import TYPE_CHECKING

from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._base import Base

if TYPE_CHECKING:
    from app.models.post import Post
    from app.models.user import User


class Conversation(Base):
    """
    Conversation model linking a buyer (initiator) to a seller (recipient)
    for a specific listing (post).
    """

    __tablename__ = "conversations"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    initiator_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    recipient_id: Mapped[int] = mapped_column(
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

    initiator: Mapped[User] = relationship(foreign_keys=[initiator_id], lazy="raise")
    recipient: Mapped[User] = relationship(foreign_keys=[recipient_id], lazy="raise")
    post: Mapped[Post] = relationship(foreign_keys=[post_id], lazy="raise")

    __table_args__ = (
        UniqueConstraint(
            "initiator_id", "recipient_id", "post_id",
            name="uq_conversation_initiator_recipient_post",
        ),
    )
