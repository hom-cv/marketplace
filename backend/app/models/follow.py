"""Follow model for user follower relationships."""

from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models._base import Base


class Follow(Base):
    """
    Follow model representing user follower relationships.

    This is an intermediary table for the many-to-many self-referential
    relationship: follower_id follows following_id.
    """

    __tablename__ = "follows"

    # Primary key
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)

    # The user who is following
    follower_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    # The user who is being followed
    following_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (
        # Prevent duplicate follows
        UniqueConstraint("follower_id", "following_id", name="uq_follower_following"),
    )
