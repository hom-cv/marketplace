"""add_fulfillment_tracking

Revision ID: 12752b427a98
Revises: a616bca8a5db
Create Date: 2025-12-10 23:39:47.752908

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '12752b427a98'
down_revision: Union[str, Sequence[str], None] = 'a616bca8a5db'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


# Define the enum type
fulfillment_status_enum = sa.Enum(
    'PACKING', 'IN_TRANSIT', 'DELIVERED',
    name='fulfillment_status_enum'
)


def upgrade() -> None:
    """Upgrade schema."""
    # Create the enum type first
    fulfillment_status_enum.create(op.get_bind(), checkfirst=True)
    
    # Then add the columns
    op.add_column('payments', sa.Column('fulfillment_status', fulfillment_status_enum, nullable=True))
    op.add_column('payments', sa.Column('tracking_number', sa.String(length=100), nullable=True))
    op.add_column('payments', sa.Column('shipped_at', sa.DateTime(timezone=True), nullable=True))
    op.add_column('payments', sa.Column('delivered_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index(op.f('ix_payments_fulfillment_status'), 'payments', ['fulfillment_status'], unique=False)


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index(op.f('ix_payments_fulfillment_status'), table_name='payments')
    op.drop_column('payments', 'delivered_at')
    op.drop_column('payments', 'shipped_at')
    op.drop_column('payments', 'tracking_number')
    op.drop_column('payments', 'fulfillment_status')
    
    # Drop the enum type
    fulfillment_status_enum.drop(op.get_bind(), checkfirst=True)

