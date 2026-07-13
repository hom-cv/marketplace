"""Seed the catch-all brand

Data-only migration: seed only the "Other" catch-all (CATCHALL_BRAND_SLUG),
which resolve_or_catchall depends on. Real brands are admin-managed via the
admin brands page. Idempotent via ON CONFLICT on slug.

Revision ID: e4b1c9a7d520
Revises: df5fab429808
Create Date: 2026-07-07

"""

import sqlalchemy as sa
from alembic import op

revision = "e4b1c9a7d520"
down_revision = "df5fab429808"
branch_labels = None
depends_on = None

# (name, slug). Only the "other" catch-all (CATCHALL_BRAND_SLUG) is seeded;
# real brands are added by admins via the admin brands page.
BRANDS = [
    ("Other", "other"),
]

_SLUGS = tuple(slug for _, slug in BRANDS)


def upgrade() -> None:
    op.get_bind().execute(
        sa.text(
            "INSERT INTO brands (name, slug) VALUES (:name, :slug) "
            "ON CONFLICT (slug) DO NOTHING"
        ),
        [{"name": name, "slug": slug} for name, slug in BRANDS],
    )


def downgrade() -> None:
    op.get_bind().execute(
        sa.text("DELETE FROM brands WHERE slug = ANY(:slugs)"),
        {"slugs": list(_SLUGS)},
    )
