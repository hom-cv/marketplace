"""Lowercase payments.payment_method to match the enum value

The PaymentMethod column now persists the enum VALUE ("card"/"promptpay") via
values_callable instead of the member NAME ("CARD"/"PROMPTPAY"). Convert the
existing rows so DB == value == API. Data-only; no DDL change.

Revision ID: c1e7a4f2b9d0
Revises: 039dba41f86f
Create Date: 2026-07-05

"""

from alembic import op

revision = "c1e7a4f2b9d0"
down_revision = "039dba41f86f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "UPDATE payments SET payment_method = lower(payment_method) "
        "WHERE payment_method IN ('CARD', 'PROMPTPAY')"
    )


def downgrade() -> None:
    op.execute(
        "UPDATE payments SET payment_method = upper(payment_method) "
        "WHERE payment_method IN ('card', 'promptpay')"
    )
