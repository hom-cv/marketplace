"""Post model for clothing marketplace listings."""

from datetime import datetime, timezone
from decimal import Decimal
from enum import auto

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

from app.core.utils import AutoName
from app.models._base import Base


class PostType(AutoName):
    """Clothing type enumeration."""

    SHIRT = auto()
    PANTS = auto()
    JACKET = auto()
    SHOES = auto()
    ACCESSORIES = auto()
    OTHER = auto()


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
    type: Mapped[PostType] = mapped_column(
        Enum(
            PostType,
            name="post_type_enum",
            create_constraint=True,
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

    # Relationships
    user: Mapped["User"] = relationship(
        back_populates="posts",
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

    # Checkout reservation: while reserved_until is in the future, the post is
    # held for the buyer behind reserved_by_payment_id and other buyers get a
    # 409 at payment creation. Claimed/released only via PostCRUD.try_reserve /
    # release_reservation / clear_reservation (single conditional UPDATEs) —
    # never assign these directly, or two concurrent checkouts can both win.
    # Expiry is lazy: no background job; the next checkout attempt takes over.
    reserved_until: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )
    # use_alter: posts→payments here + payments→posts (post_id) form a
    # circular FK pair, so this one must be created as a separate ALTER.
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
        return (
            self.reserved_by_payment_id is not None
            and self.reserved_until is not None
            and self.reserved_until > datetime.now(timezone.utc)
        )
