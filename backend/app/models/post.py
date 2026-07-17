"""Post model for clothing marketplace listings."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import (
    BigInteger,
    DateTime,
    Enum,
    ForeignKey,
    Numeric,
    String,
    Text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.post import Gender, PostCategory, Subcategory
from app.models._base import Base


class Post(Base):
    """
    Post model representing clothing listings in the marketplace.

    Users can create posts to sell their men's clothing items.
    """

    __tablename__ = "posts"

    # Primary fields
    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)
    title: Mapped[str] = mapped_column(
        String(200),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )
    category: Mapped[PostCategory] = mapped_column(
        Enum(
            PostCategory,
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
        index=True,
    )
    subcategory: Mapped[Subcategory | None] = mapped_column(
        Enum(
            Subcategory,
            native_enum=False,
            length=64,
        ),
        nullable=True,
        index=True,
    )
    gender: Mapped[Gender] = mapped_column(
        Enum(
            Gender,
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
        index=True,
    )
    price: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
    )
    shipping_cost: Mapped[Decimal] = mapped_column(
        Numeric(10, 2),
        nullable=False,
        default=0,
    )
    # Single image URL (first/cover image for backward compatibility)
    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
    )
    # Multiple image URLs stored as JSON array
    image_urls: Mapped[list[str] | None] = mapped_column(
        JSONB,
        nullable=True,
        default=list,
    )

    # Sizing information
    # Size is a string to accommodate both letter sizes (S, M, L) and numeric sizes (28, 30, 42)
    size: Mapped[str | None] = mapped_column(
        String(20),
        nullable=True,
        default=None,
        index=True,
    )
    # Measurements stored as JSONB - structure varies by category
    # Tops: { shoulder, length, bust, sleeve }
    # Pants: { total_length, inseam, rise, hip }
    # Shoes: { insole_length }
    measurements: Mapped[dict | None] = mapped_column(
        JSONB,
        nullable=True,
        default=None,
    )

    # Foreign keys - RESTRICT prevents deletion of referenced user
    user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    # Brand is optional; a NULL brand means "Other" (unspecified). SET NULL so
    # deleting a brand leaves its listings intact, falling back to "Other".
    brand_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("brands.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    # Relationships
    user: Mapped["User"] = relationship(
        back_populates="posts",
        lazy="selectin",
    )
    brand: Mapped["Brand | None"] = relationship(  # type: ignore # noqa
        lazy="selectin",
    )
    tags: Mapped[list["Tag"]] = relationship(  # type: ignore # noqa
        secondary="post_tags",
        lazy="selectin",
    )
    payments: Mapped[list["Payment"]] = relationship(
        back_populates="post",
        # Don't cascade delete - preserve payment records
        foreign_keys="Payment.post_id",
    )
    likes: Mapped[list["Like"]] = relationship(  # type: ignore # noqa
        back_populates="post",
        cascade="all, delete-orphan",
    )

    # Soft delete
    deleted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
        index=True,
    )

    reserved_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    reserved_by_payment_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey(
            "payments.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_posts_reserved_by_payment_id",
        ),
        nullable=True,
        default=None,
    )

    @property
    def is_deleted(self) -> bool:
        """Check if post has been soft deleted."""
        return self.deleted_at is not None

    @property
    def is_reserved(self) -> bool:
        """
        Whether a checkout reservation is currently held on this post.
        """
        if self.reserved_by_payment_id is None or self.reserved_until is None:
            return False

        reserved_until = self.reserved_until

        if reserved_until.tzinfo is None:
            reserved_until = reserved_until.replace(tzinfo=timezone.utc)

        return reserved_until > datetime.now(timezone.utc)
