"""add_seller_role

Add SELLER value to the roletype enum and seed the role into user_roles.
Split from the schema migration (7c3f4a21b8e5) so that ALTER TYPE ADD VALUE
commits in its own transaction before the new value is used.

Revision ID: 030bbedd90cf
Revises: 7c3f4a21b8e5
Create Date: 2026-04-20 22:54:15.060726

"""
from typing import Sequence, Union

import sqlalchemy as sa
from sqlalchemy import BigInteger, Enum
from sqlalchemy.sql import column, table

from alembic import op

# revision identifiers, used by Alembic.
revision: str = '030bbedd90cf'
down_revision: Union[str, Sequence[str], None] = '7c3f4a21b8e5'
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
    """Add SELLER to roletype enum and seed the role."""
    op.execute("ALTER TYPE roletype ADD VALUE IF NOT EXISTS 'SELLER'")
    op.execute("COMMIT")
    op.bulk_insert(user_roles_table, [{"role": "SELLER"}])


def downgrade() -> None:
    """Remove SELLER role and rebuild the enum without it."""
    conn = op.get_bind()

    pg_enum = sa.table(
        "pg_enum",
        sa.column("enumlabel", sa.String),
        sa.column("enumtypid", sa.BigInteger),
    )
    pg_type = sa.table(
        "pg_type",
        sa.column("oid", sa.BigInteger),
        sa.column("typname", sa.String),
    )

    seller_present = conn.execute(
        sa.select(sa.literal(1))
        .select_from(pg_enum.join(pg_type, pg_enum.c.enumtypid == pg_type.c.oid))
        .where(sa.and_(
            pg_enum.c.enumlabel == "SELLER",
            pg_type.c.typname == "roletype",
        ))
    ).first() is not None

    if not seller_present:
        return

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
