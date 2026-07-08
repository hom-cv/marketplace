"""Seed the curated brand list (incl. the catch-all)

Data-only migration: brands are admin/seed-managed, not user-created, so seed a
starter set plus the "Other" catch-all. Idempotent via ON CONFLICT on slug.

Revision ID: e4b1c9a7d520
Revises: df5fab429808
Create Date: 2026-07-07

"""

from alembic import op

revision = "e4b1c9a7d520"
down_revision = "df5fab429808"
branch_labels = None
depends_on = None

# (name, slug). "other" is the catch-all (CATCHALL_BRAND_SLUG).
BRANDS = [
    ("Other", "other"),
    ("Nike", "nike"),
    ("Adidas", "adidas"),
    ("Uniqlo", "uniqlo"),
    ("Zara", "zara"),
    ("H&M", "h-m"),
    ("Supreme", "supreme"),
    ("The North Face", "the-north-face"),
    ("Carhartt", "carhartt"),
    ("Levi's", "levi-s"),
    ("Champion", "champion"),
    ("Patagonia", "patagonia"),
    ("Ralph Lauren", "ralph-lauren"),
    ("Gucci", "gucci"),
    ("Louis Vuitton", "louis-vuitton"),
]

_SLUGS = tuple(slug for _, slug in BRANDS)


def upgrade() -> None:
    values = ", ".join(
        f"('{name.replace(chr(39), chr(39) * 2)}', '{slug}')"
        for name, slug in BRANDS
    )
    op.execute(
        f"INSERT INTO brands (name, slug) VALUES {values} "
        "ON CONFLICT (slug) DO NOTHING"
    )


def downgrade() -> None:
    slugs = ", ".join(f"'{s}'" for s in _SLUGS)
    op.execute(f"DELETE FROM brands WHERE slug IN ({slugs})")
