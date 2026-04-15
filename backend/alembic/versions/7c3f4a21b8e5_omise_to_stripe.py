"""omise to stripe

Rename Omise columns to Stripe equivalents and drop Omise-only fields.
This is a destructive pre-launch migration: it drops columns that hold
Omise-specific data (authorize_uri, qr_code_uri, bank_brand, etc.) that
cannot be reconstructed from Stripe data. The upgrade() refuses to run
if `payments` or `seller_profiles` contain any rows — if you see that
error, back up and truncate those tables first, or write a proper data
migration that maps Omise artifacts to Stripe equivalents.

Revision ID: 7c3f4a21b8e5
Revises: 629fe1a92027
Create Date: 2026-04-11

"""
from typing import Sequence, Union

import sqlalchemy as sa

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '7c3f4a21b8e5'
down_revision: Union[str, Sequence[str], None] = '629fe1a92027'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Rename Omise columns to Stripe and drop Omise-only fields."""
    conn = op.get_bind()
    for table in ("payments", "seller_profiles"):
        count = conn.execute(sa.text(f"SELECT COUNT(*) FROM {table}")).scalar_one()
        if count:
            raise RuntimeError(
                f"Refusing destructive Omise→Stripe migration: {table} has "
                f"{count} rows. Truncate it first or write a data migration."
            )

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

    op.create_index(
        'ix_payments_stripe_payment_intent_id',
        'payments',
        ['stripe_payment_intent_id'],
        unique=True,
    )

    op.drop_column('payments', 'omise_transfer_id')
    op.drop_column('payments', 'transferred_at')
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
    op.add_column(
        'payments',
        sa.Column('transferred_at', sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        'payments',
        sa.Column('omise_transfer_id', sa.String(length=255), nullable=True),
    )

    op.drop_index('ix_payments_stripe_payment_intent_id', table_name='payments')

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
