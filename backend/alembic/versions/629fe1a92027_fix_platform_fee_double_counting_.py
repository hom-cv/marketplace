"""fix_platform_fee_double_counting_transfer_fee

Back-populate transfer_fee for historical rows (added as NULL by the
previous migration), then subtract it from platform_fee so the two
columns are stored independently.

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

# 30 THB × 100 satang/THB
TRANSFER_FEE_SATANG = 3000


def upgrade() -> None:
    """Back-populate transfer_fee and fix platform_fee for historical rows."""
    op.execute(
        """
        UPDATE payments
        SET transfer_fee = :transfer_fee,
            platform_fee = platform_fee - :transfer_fee
        WHERE transfer_fee IS NULL
          AND platform_fee IS NOT NULL
        """,
        transfer_fee=TRANSFER_FEE_SATANG,
    )


def downgrade() -> None:
    """Fold transfer_fee back into platform_fee for historical rows."""
    op.execute(
        """
        UPDATE payments
        SET platform_fee = platform_fee + transfer_fee,
            transfer_fee = NULL
        WHERE transfer_fee IS NOT NULL
          AND platform_fee IS NOT NULL
        """
    )
