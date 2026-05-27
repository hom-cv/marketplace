"""add_disputed_payment_status

Add the DISPUTED value to the payment_status_enum. Used by the chargeback
webhook handlers (charge.dispute.created/closed): a successful payment moves to
DISPUTED when a dispute opens, then to SUCCESSFUL (won) or REFUNDED (lost).

Split as its own migration so ALTER TYPE ADD VALUE commits before the value is
ever used (PostgreSQL forbids using a newly added enum value in the same
transaction that added it), following the pattern in 030bbedd90cf.

Revision ID: 140147275f4d
Revises: 030bbedd90cf
Create Date: 2026-05-26 00:00:00.000000

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '140147275f4d'
down_revision: Union[str, Sequence[str], None] = '030bbedd90cf'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add DISPUTED to payment_status_enum."""
    op.execute("ALTER TYPE payment_status_enum ADD VALUE IF NOT EXISTS 'DISPUTED'")
    op.execute("COMMIT")  # required: env.py wraps all migrations in one transaction


def downgrade() -> None:
    """Rebuild payment_status_enum without DISPUTED."""
    # Re-map any DISPUTED rows so the cast to the DISPUTED-less enum succeeds.
    op.execute("UPDATE payments SET status = 'SUCCESSFUL' WHERE status = 'DISPUTED'")

    old_enum = sa.Enum(
        "PENDING", "AUTHORIZED", "SUCCESSFUL", "FAILED", "REFUNDED", "EXPIRED",
        "DISPUTED",
        name="payment_status_enum",
    )
    tmp_enum = sa.Enum(
        "PENDING", "AUTHORIZED", "SUCCESSFUL", "FAILED", "REFUNDED", "EXPIRED",
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
