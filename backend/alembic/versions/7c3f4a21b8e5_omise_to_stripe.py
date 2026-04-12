"""omise to stripe

Rename Omise columns to Stripe equivalents and drop Omise-only fields.
This is a destructive pre-launch migration — it assumes `payments` and
`seller_profiles` are empty. Verify with:

    SELECT count(*) FROM payments;
    SELECT count(*) FROM seller_profiles;

Both must return 0 before running `alembic upgrade head`.

Revision ID: 7c3f4a21b8e5
Revises: 629fe1a92027
Create Date: 2026-04-11

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7c3f4a21b8e5'
down_revision: Union[str, Sequence[str], None] = '629fe1a92027'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename Omise columns to Stripe and drop Omise-only fields."""

    # --- payments table --------------------------------------------------
    op.drop_index('ix_payments_omise_charge_id', table_name='payments')
    op.drop_constraint('payments_omise_transfer_id_key', 'payments', type_='unique')

    op.alter_column(
        'payments',
        'omise_charge_id',
        new_column_name='stripe_payment_intent_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )
    op.alter_column(
        'payments',
        'omise_transfer_id',
        new_column_name='stripe_transfer_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )

    op.create_index(
        'ix_payments_stripe_payment_intent_id',
        'payments',
        ['stripe_payment_intent_id'],
        unique=True,
    )
    op.create_unique_constraint(
        'payments_stripe_transfer_id_key',
        'payments',
        ['stripe_transfer_id'],
    )

    op.drop_column('payments', 'authorize_uri')
    op.drop_column('payments', 'return_uri')
    op.drop_column('payments', 'qr_code_uri')
    op.drop_column('payments', 'expires_at')
    op.drop_column('payments', 'transfer_fee')

    # --- seller_profiles table ------------------------------------------
    op.drop_constraint(
        'seller_profiles_omise_recipient_id_key', 'seller_profiles', type_='unique'
    )
    op.alter_column(
        'seller_profiles',
        'omise_recipient_id',
        new_column_name='stripe_account_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )
    op.create_unique_constraint(
        'seller_profiles_stripe_account_id_key',
        'seller_profiles',
        ['stripe_account_id'],
    )

    op.drop_column('seller_profiles', 'bank_brand')
    op.drop_column('seller_profiles', 'bank_account_last_digits')
    op.drop_column('seller_profiles', 'bank_account_name')

    op.add_column(
        'seller_profiles',
        sa.Column(
            'charges_enabled',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        'seller_profiles',
        sa.Column(
            'payouts_enabled',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )
    op.add_column(
        'seller_profiles',
        sa.Column(
            'details_submitted',
            sa.Boolean(),
            nullable=False,
            server_default=sa.false(),
        ),
    )


def downgrade() -> None:
    """Reverse the Stripe rename and restore Omise columns (lossy)."""

    # --- seller_profiles table ------------------------------------------
    op.drop_column('seller_profiles', 'details_submitted')
    op.drop_column('seller_profiles', 'payouts_enabled')
    op.drop_column('seller_profiles', 'charges_enabled')

    op.add_column(
        'seller_profiles',
        sa.Column('bank_account_name', sa.String(length=255), nullable=True),
    )
    op.add_column(
        'seller_profiles',
        sa.Column('bank_account_last_digits', sa.String(length=4), nullable=True),
    )
    op.add_column(
        'seller_profiles',
        sa.Column('bank_brand', sa.String(length=64), nullable=True),
    )

    op.drop_constraint(
        'seller_profiles_stripe_account_id_key', 'seller_profiles', type_='unique'
    )
    op.alter_column(
        'seller_profiles',
        'stripe_account_id',
        new_column_name='omise_recipient_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )
    op.create_unique_constraint(
        'seller_profiles_omise_recipient_id_key',
        'seller_profiles',
        ['omise_recipient_id'],
    )

    # --- payments table --------------------------------------------------
    op.add_column(
        'payments',
        sa.Column('transfer_fee', sa.BigInteger(), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('qr_code_uri', sa.String(length=512), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('return_uri', sa.String(length=512), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('authorize_uri', sa.String(length=512), nullable=True),
    )

    op.drop_constraint(
        'payments_stripe_transfer_id_key', 'payments', type_='unique'
    )
    op.drop_index('ix_payments_stripe_payment_intent_id', table_name='payments')

    op.alter_column(
        'payments',
        'stripe_transfer_id',
        new_column_name='omise_transfer_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )
    op.alter_column(
        'payments',
        'stripe_payment_intent_id',
        new_column_name='omise_charge_id',
        existing_type=sa.String(length=255),
        existing_nullable=True,
    )

    op.create_unique_constraint(
        'payments_omise_transfer_id_key',
        'payments',
        ['omise_transfer_id'],
    )
    op.create_index(
        'ix_payments_omise_charge_id',
        'payments',
        ['omise_charge_id'],
        unique=True,
    )
