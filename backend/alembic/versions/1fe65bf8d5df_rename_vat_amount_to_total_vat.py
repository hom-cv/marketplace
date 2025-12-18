"""rename_vat_amount_to_total_vat

Revision ID: 1fe65bf8d5df
Revises: d92f658b9225
Create Date: 2025-12-19 00:21:38.310051

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '1fe65bf8d5df'
down_revision: Union[str, Sequence[str], None] = 'd92f658b9225'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename vat_amount to total_vat (preserves existing data)."""
    op.alter_column('payments', 'vat_amount', new_column_name='total_vat')


def downgrade() -> None:
    """Rename total_vat back to vat_amount."""
    op.alter_column('payments', 'total_vat', new_column_name='vat_amount')
