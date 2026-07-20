"""Feedback model for buyer reviews on completed purchases."""

from sqlalchemy import (
    BigInteger,
    CheckConstraint,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._base import Base


class Feedback(Base):
    """
    Buyer feedback (rating + comment) left on a delivered purchase.

    One feedback per payment. The reviewer is the buyer; the subject is the
    seller. Ratings are 1-5.
    """

    __tablename__ = "feedback"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    payment_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("payments.id", ondelete="RESTRICT"),
        nullable=False,
        unique=True,
        index=True,
    )
    reviewer_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    seller_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    rating: Mapped[int] = mapped_column(nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)

    # The buyer who wrote the feedback (loaded for the seller's feedback list).
    reviewer: Mapped["User"] = relationship(  # type: ignore # noqa: F821
        foreign_keys=[reviewer_user_id],
        lazy="selectin",
    )

    # payment_id is unique via its column index (one feedback per purchase).
    __table_args__ = (
        CheckConstraint("rating >= 1 AND rating <= 5", name="ck_feedback_rating"),
    )
