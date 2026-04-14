"""add_shipping_carrier

Revision ID: 9431255f1a21
Revises: 12752b427a98
Create Date: 2025-12-11 00:08:04.348291

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '9431255f1a21'
down_revision: Union[str, Sequence[str], None] = '12752b427a98'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define the enum type
shipping_carrier_enum = sa.Enum(
    'EMS', 'KEX', 'FLASH_EXPRESS', 'J_AND_T',
    name='shipping_carrier_enum'
)


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first
    shipping_carrier_enum.create(op.get_bind(), checkfirst=True)
    
    # Then add the column
    op.add_column('payments', sa.Column('shipping_carrier', shipping_carrier_enum, nullable=True))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('payments', 'shipping_carrier')
    
    # Drop the enum type
    shipping_carrier_enum.drop(op.get_bind(), checkfirst=True)

