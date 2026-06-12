"""remove_seller_role

Remove the SELLER value from the roletype enum, along with the seeded role
row and any user assignments. The role was written on seller verification
but never read for authorization (gating is on
SellerProfile.verification_status) and never revoked, so it was guaranteed
to drift from the truth. Mirrors the downgrade of 030bbedd90cf.

Revision ID: b41f0c7d92e1
Revises: cfec8a100645
Create Date: 2026-06-12

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy import BigInteger, Enum
from sqlalchemy.sql import column, table

from alembic import op

# revision identifiers, used by Alembic.
revision: str = 'b41f0c7d92e1'
down_revision: Union[str, Sequence[str], None] = 'cfec8a100645'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

user_roles_table = table(
    "user_roles",
    column("id", BigInteger),
    column("role", Enum("ADMIN", "USER", "MODERATOR", "SELLER", name="roletype")),
)

user_to_user_roles_table = table(
    "user_to_user_roles",
    column("role_id", BigInteger),
)


def upgrade() -> None:
    """Delete SELLER assignments and rebuild the enum without the value."""
    seller_id_subq = (
        sa.select(user_roles_table.c.id)
        .where(user_roles_table.c.role == "SELLER")
        .scalar_subquery()
    )
    op.execute(
        user_to_user_roles_table.delete().where(
            user_to_user_roles_table.c.role_id == seller_id_subq
        )
    )
    op.execute(user_roles_table.delete().where(user_roles_table.c.role == "SELLER"))

    old_enum = sa.Enum("ADMIN", "USER", "MODERATOR", "SELLER", name="roletype")
    tmp_enum = sa.Enum("ADMIN", "USER", "MODERATOR", name="roletype_tmp")

    tmp_enum.create(op.get_bind(), checkfirst=False)
    op.alter_column(
        "user_roles", "role",
        existing_type=old_enum,
        type_=tmp_enum,
        postgresql_using="role::text::roletype_tmp",
    )
    old_enum.drop(op.get_bind(), checkfirst=False)
    op.execute("ALTER TYPE roletype_tmp RENAME TO roletype")


def downgrade() -> None:
    """Re-add SELLER to the enum and reseed the role row."""
    # ALTER TYPE ADD VALUE must commit before the new value is usable by the
    # insert below. autocommit_block() runs it outside the migration
    # transaction without breaking Alembic's transaction management (unlike
    # a raw COMMIT, which would desync test harnesses and --sql mode).
    with op.get_context().autocommit_block():
        op.execute("ALTER TYPE roletype ADD VALUE IF NOT EXISTS 'SELLER'")
    op.bulk_insert(user_roles_table, [{"role": "SELLER"}])
