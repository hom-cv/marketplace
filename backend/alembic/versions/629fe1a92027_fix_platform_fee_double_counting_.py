"""fix_platform_fee_double_counting_transfer_fee

Subtract transfer_fee from platform_fee for existing payments where
transfer_fee was previously included in platform_fee (double-counted).

Revision ID: 629fe1a92027
Revises: 53a80c00e8cc
Create Date: 2026-03-14 14:53:57.926396

"""
from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = '629fe1a92027'
down_revision: Union[str, Sequence[str], None] = '53a80c00e8cc'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Remove transfer_fee from platform_fee for existing rows."""
    op.execute(
        """
        UPDATE payments
        SET platform_fee = platform_fee - transfer_fee
        WHERE transfer_fee IS NOT NULL
          AND platform_fee IS NOT NULL
        """
    )


def downgrade() -> None:
    """Add transfer_fee back into platform_fee."""
    op.execute(
        """
        UPDATE payments
        SET platform_fee = platform_fee + transfer_fee
        WHERE transfer_fee IS NOT NULL
          AND platform_fee IS NOT NULL
        """
    )
