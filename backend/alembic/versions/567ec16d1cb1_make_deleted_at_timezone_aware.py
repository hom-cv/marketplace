"""make deleted_at timezone aware

Revision ID: 567ec16d1cb1
Revises: 140147275f4d
Create Date: 2026-06-08 17:16:06.674463

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '567ec16d1cb1'
down_revision: Union[str, Sequence[str], None] = '140147275f4d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Make posts.deleted_at and users.deleted_at timezone-aware.

    These were the only datetime columns left as TIMESTAMP WITHOUT TIME ZONE;
    the app writes tz-aware UTC values, which asyncpg rejects on a naive column.
    Existing naive values are interpreted as UTC.
    """
    for table in ("posts", "users"):
        op.alter_column(
            table,
            "deleted_at",
            type_=sa.DateTime(timezone=True),
            existing_type=sa.DateTime(timezone=False),
            existing_nullable=True,
            postgresql_using="deleted_at AT TIME ZONE 'UTC'",
        )


def downgrade() -> None:
    """Revert posts.deleted_at and users.deleted_at to naive timestamps."""
    for table in ("posts", "users"):
        op.alter_column(
            table,
            "deleted_at",
            type_=sa.DateTime(timezone=False),
            existing_type=sa.DateTime(timezone=True),
            existing_nullable=True,
            postgresql_using="deleted_at AT TIME ZONE 'UTC'",
        )
