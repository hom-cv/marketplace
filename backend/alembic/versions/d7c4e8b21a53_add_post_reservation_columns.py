"""add_post_reservation_columns

Add checkout-reservation columns to posts. While reserved_until is in the
future, the post is held for the buyer behind reserved_by_payment_id and
other buyers are rejected at payment creation. The claim is a single
conditional UPDATE (PostCRUD.try_reserve); expiry is lazy (no background
job). The FK is created as a separate ALTER because posts->payments here
plus payments->posts (post_id) form a circular pair.

Revision ID: d7c4e8b21a53
Revises: b41f0c7d92e1
Create Date: 2026-06-12

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'd7c4e8b21a53'
down_revision: Union[str, Sequence[str], None] = 'b41f0c7d92e1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "posts",
        sa.Column("reserved_until", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "posts",
        sa.Column("reserved_by_payment_id", sa.BigInteger(), nullable=True),
    )
    op.create_foreign_key(
        "fk_posts_reserved_by_payment_id",
        "posts",
        "payments",
        ["reserved_by_payment_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_posts_reserved_by_payment_id", "posts", type_="foreignkey"
    )
    op.drop_column("posts", "reserved_by_payment_id")
    op.drop_column("posts", "reserved_until")
