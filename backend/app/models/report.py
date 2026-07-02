"""Report model for user and listing reports."""

from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants.report import ReportReason, ReportStatus, ReportType
from app.models._base import Base


class Report(Base):
    """
    Report model for user and listing reports.

    Users can report listings (posts) or other users for violations.
    Reports are reviewed by admins.
    """

    __tablename__ = "reports"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, index=True)

    # Reporter
    reporter_user_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )

    # Report type and target
    report_type: Mapped[ReportType] = mapped_column(
        Enum(
            ReportType,
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
        index=True,
    )
    reported_user_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("users.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )
    reported_post_id: Mapped[int | None] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="RESTRICT"),
        nullable=True,
        index=True,
    )

    # Report details
    reason: Mapped[ReportReason] = mapped_column(
        Enum(
            ReportReason,
            native_enum=False,
            validate_strings=True,
        ),
        nullable=False,
        index=True,
    )
    description: Mapped[str] = mapped_column(
        Text,
        nullable=False,
    )

    # Status and review
    status: Mapped[ReportStatus] = mapped_column(
        Enum(
            ReportStatus,
            native_enum=False,
            validate_strings=True,
        ),
        default=ReportStatus.PENDING,
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
    admin_notes: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    # Relationships
    reporter: Mapped["User"] = relationship(
        foreign_keys=[reporter_user_id],
        lazy="selectin",
    )
    reported_user: Mapped["User | None"] = relationship(
        foreign_keys=[reported_user_id],
        lazy="selectin",
    )
    reported_post: Mapped["Post | None"] = relationship(
        lazy="selectin",
    )
    reviewed_by: Mapped["User | None"] = relationship(
        foreign_keys=[reviewed_by_user_id],
        lazy="selectin",
    )
