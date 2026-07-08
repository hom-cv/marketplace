"""Tag model — normalized hashtags, many-to-many with posts."""

from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models._base import Base


class Tag(Base):
    """A hashtag. ``name`` is normalized (lowercase, no leading '#') and unique."""

    __tablename__ = "tags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        unique=True,
        index=True,
    )
