"""add_refund_required_payment_status

Revision ID: e2f9a1c4b8d6
Revises: d7c4e8b21a53
Create Date: 2026-06-13 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'e2f9a1c4b8d6'
down_revision: Union[str, Sequence[str], None] = 'd7c4e8b21a53'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add REFUND_REQUIRED to payment_status_enum."""

    with op.get_context().autocommit_block():
        op.execute(
            "ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'REFUND_REQUIRED'"
        )


def downgrade() -> None:
    """Rebuild payment_status_enum without REFUND_REQUIRED."""
    op.execute(
        "UPDATE payments SET status = 'SUCCESSFUL' WHERE status = 'REFUND_REQUIRED'"
    )

    old_enum = sa.Enum(
        "PENDING", "AUTHORIZED", "SUCCESSFUL", "FAILED", "REFUNDED", "EXPIRED",
        "DISPUTED", "REFUND_REQUIRED",
        name="payment_status_enum",
    )
    tmp_enum = sa.Enum(
        "PENDING", "AUTHORIZED", "SUCCESSFUL", "FAILED", "REFUNDED", "EXPIRED",
        "DISPUTED",
        name="payment_status_enum_tmp",
    )

    tmp_enum.create(op.get_bind(), checkfirst=False)
    op.alter_column(
        "payments", "status",
        existing_type=old_enum,
        type_=tmp_enum,
        postgresql_using="status::text::payment_status_enum_tmp",
    )
    old_enum.drop(op.get_bind(), checkfirst=False)
    op.execute("ALTER TYPE payment_status_enum_tmp RENAME TO payment_status_enum")
