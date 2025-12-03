"""Seed User roles

Revision ID: 25db68c57aba
Revises: 6793b7910c18
Create Date: 2025-12-04 01:20:20.850187

"""

from typing import Sequence, Union

from alembic import op
from sqlalchemy import BigInteger, Enum
from sqlalchemy.sql import column, table

# revision identifiers, used by Alembic.
revision: str = "25db68c57aba"
down_revision: Union[str, Sequence[str], None] = "6793b7910c18"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Define the table structure for insertion/deletion
user_roles_table = table(
    "user_roles",
    column("id", BigInteger),
    column("role", Enum("ADMIN", "USER", "MODERATOR", name="roletype")),
)

# Define the roles data to be inserted
# Note: Since the 'id' is a BigInteger primary key, we let the database handle auto-increment
# The 'role' column references the 'roletype' enum
roles_data = [
    {"role": "ADMIN"},
    {"role": "USER"},
    {"role": "MODERATOR"},
]


def upgrade() -> None:
    """Upgrade schema - Seed initial roles."""
    # Use op.bulk_insert to insert the predefined roles
    op.bulk_insert(user_roles_table, roles_data)


def downgrade() -> None:
    """Downgrade schema - Delete the seeded roles."""
    # Delete the inserted roles using a simple SQL expression
    # You must import and use text() for complex deletion conditions
    op.execute(
        user_roles_table.delete().where(
            user_roles_table.columns.role.in_(["ADMIN", "USER", "MODERATOR"])
        )
    )
