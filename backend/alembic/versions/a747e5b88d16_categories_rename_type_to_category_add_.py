"""categories: rename type to category, add subcategory

Revision ID: a747e5b88d16
Revises: df5fab429808
Create Date: 2026-07-15 16:15:12.673528

Adjusted from autogenerate: preserve data by RENAMING type->category and
remapping legacy values in place, rather than drop+add. subcategory is left
NULL for legacy rows (they predate the taxonomy; "uncategorized").
"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'a747e5b88d16'
down_revision: Union[str, Sequence[str], None] = 'df5fab429808'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Legacy PostType -> new top-level PostCategory.
_TYPE_TO_CATEGORY = {
    "SHIRT": "TOPS",
    "PANTS": "BOTTOMS",
    "JACKET": "OUTERWEAR",
    "SHOES": "FOOTWEAR",
    "ACCESSORIES": "ACCESSORIES",
    "OTHER": "ACCESSORIES",
}
# Reverse for downgrade (ACCESSORIES had two sources; pick the identity).
_CATEGORY_TO_TYPE = {
    "TOPS": "SHIRT",
    "BOTTOMS": "PANTS",
    "OUTERWEAR": "JACKET",
    "FOOTWEAR": "SHOES",
    "ACCESSORIES": "ACCESSORIES",
    "TAILORING": "OTHER",
    "DRESSES": "OTHER",
    "JEWELRY": "ACCESSORIES",
    "BAGS": "OTHER",
}

# Lightweight table handle for data-only UPDATEs via SQLAlchemy core.
_posts = sa.table("posts", sa.column("category", sa.String))


def _remap(mapping: dict[str, str]) -> None:
    """Rewrite posts.category values in place, dialect-agnostically."""
    for old, new in mapping.items():
        op.execute(
            _posts.update().where(_posts.c.category == old).values(category=new)
        )


def upgrade() -> None:
    """Upgrade schema."""
    # Rename the column (preserves data). New values fit the existing width.
    op.alter_column("posts", "type", new_column_name="category")
    # Re-point the index at the renamed column (drop+create is portable;
    # Alembic has no rename_index op).
    op.drop_index("ix_posts_type", table_name="posts")
    op.create_index(
        op.f("ix_posts_category"), "posts", ["category"], unique=False
    )

    # Remap legacy values in place.
    _remap(_TYPE_TO_CATEGORY)

    # New granular column; NULL for legacy rows ("uncategorized").
    op.add_column(
        "posts", sa.Column("subcategory", sa.String(length=64), nullable=True)
    )
    op.create_index(
        op.f("ix_posts_subcategory"), "posts", ["subcategory"], unique=False
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f("ix_posts_subcategory"), table_name="posts")
    op.drop_column("posts", "subcategory")

    _remap(_CATEGORY_TO_TYPE)

    op.drop_index(op.f("ix_posts_category"), table_name="posts")
    op.create_index("ix_posts_type", "posts", ["category"], unique=False)
    op.alter_column("posts", "category", new_column_name="type")
