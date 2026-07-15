"""categories: rename type to category, add subcategory

Revision ID: a747e5b88d16
Revises: df5fab429808
Create Date: 2026-07-15 16:15:12.673528

Adjusted from autogenerate: preserve data by RENAMING type->category and
remapping legacy values in place, rather than drop+add. subcategory is left
NULL for legacy rows (they predate the taxonomy; "uncategorized").
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


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


def upgrade() -> None:
    """Upgrade schema."""
    # Rename the column (preserves data), widen to fit new values.
    op.alter_column("posts", "type", new_column_name="category")
    op.alter_column(
        "posts", "category", type_=sa.String(length=32), existing_nullable=False
    )
    op.execute("ALTER INDEX ix_posts_type RENAME TO ix_posts_category")

    # Remap legacy values in place.
    for old, new in _TYPE_TO_CATEGORY.items():
        op.execute(f"UPDATE posts SET category = '{new}' WHERE category = '{old}'")

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

    for new, old in _CATEGORY_TO_TYPE.items():
        op.execute(f"UPDATE posts SET category = '{old}' WHERE category = '{new}'")

    op.execute("ALTER INDEX ix_posts_category RENAME TO ix_posts_type")
    op.alter_column(
        "posts", "category", type_=sa.String(length=11), existing_nullable=False
    )
    op.alter_column("posts", "category", new_column_name="type")
