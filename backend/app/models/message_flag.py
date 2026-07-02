"""MessageFlag model for tracking flagged messages with off-site transaction patterns."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.message_flag import MessageFlagStatus
from app.models._base import Base


class MessageFlag(Base):
    """
    Tracks messages flagged by the automated scanner for suspected
    off-site transaction attempts.
    """

    __tablename__ = "message_flags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    message_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("messages.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    conversation_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("conversations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    sender_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    matched_patterns: Mapped[str] = mapped_column(Text, nullable=False)

    status: Mapped[MessageFlagStatus] = mapped_column(
        Enum(
            MessageFlagStatus,
            native_enum=False,
            validate_strings=True,
        ),
        default=MessageFlagStatus.PENDING,
        nullable=False,
        index=True,
    )

    reviewed_by_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )

    # Relationships
    message: Mapped["Message"] = relationship(
        foreign_keys=[message_id],
        lazy="selectin",
    )
    conversation: Mapped["Conversation"] = relationship(
        foreign_keys=[conversation_id],
        lazy="selectin",
    )
    sender: Mapped["User"] = relationship(
        foreign_keys=[sender_id],
        lazy="selectin",
    )
    reviewed_by: Mapped["User | None"] = relationship(
        foreign_keys=[reviewed_by_user_id],
        lazy="selectin",
    )
