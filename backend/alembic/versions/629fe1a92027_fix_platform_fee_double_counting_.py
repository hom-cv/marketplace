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
    """Back-populate transfer_fee, then subtract it from platform_fee."""
    # Step 1: Set transfer_fee on historical rows where it was never populated.
    op.execute(
        f"""
        UPDATE payments
        SET transfer_fee = {TRANSFER_FEE_SATANG}
        WHERE transfer_fee IS NULL
          AND platform_fee IS NOT NULL
        """
    )
    # Step 2: Remove transfer_fee from platform_fee for all rows.
    op.execute(
        """
        UPDATE payments
        SET platform_fee = platform_fee - transfer_fee
        WHERE transfer_fee IS NOT NULL
          AND platform_fee IS NOT NULL
        """
    )


def downgrade() -> None:
    """Add transfer_fee back into platform_fee, then clear historical transfer_fee."""
    # Step 1: Fold transfer_fee back into platform_fee.
    op.execute(
        """
        UPDATE payments
        SET platform_fee = platform_fee + transfer_fee
        WHERE transfer_fee IS NOT NULL
          AND platform_fee IS NOT NULL
        """
    )
    # Step 2: Clear transfer_fee on rows that had it back-populated.
    # We can't distinguish which rows were back-populated vs. set by app code,
    # so we leave transfer_fee populated. The old code simply ignored the column.
