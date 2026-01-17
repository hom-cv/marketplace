"""Like model for user favorites on posts."""

from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models._base import Base


class Like(Base):
    """
    Like model representing user favorites on posts.

    This is an intermediary table for the many-to-many relationship
    between users and posts they have liked.
    """

    __tablename__ = "likes"

    # Primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # Foreign keys
    user_id: Mapped[int] = mapped_column(
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

    # Relationships
    user: Mapped["User"] = relationship(  # type: ignore # noqa
        back_populates="likes",
        lazy="selectin",
    )
    post: Mapped["Post"] = relationship(  # type: ignore # noqa
        back_populates="likes",
        lazy="selectin",
    )

    __table_args__ = (
        # Prevent duplicate likes
        UniqueConstraint("user_id", "post_id", name="uq_user_post_like"),
    )
