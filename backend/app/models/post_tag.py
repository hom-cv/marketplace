"""Association model for the post <-> tag many-to-many (mirrors Like)."""

from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.models._base import Base


class PostTag(Base):
    """Join row linking a post to a tag."""

    __tablename__ = "post_tags"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    post_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    tag_id: Mapped[int] = mapped_column(
        BigInteger,
        ForeignKey("tags.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    __table_args__ = (UniqueConstraint("post_id", "tag_id", name="uq_post_tag"),)
