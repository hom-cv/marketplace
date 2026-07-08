"""Brand model — curated lookup for post brands (one brand per post)."""

from sqlalchemy import BigInteger, String
from sqlalchemy.orm import Mapped, mapped_column

from app.models._base import Base


class Brand(Base):
    """A canonical clothing brand. Posts reference it via ``brand_id``.

    ``slug`` is the lowercased canonical key (unique) used for dedupe and URLs;
    ``name`` is the display form.
    """

    __tablename__ = "brands"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    slug: Mapped[str] = mapped_column(
        String(128),
        nullable=False,
        unique=True,
        index=True,
    )
