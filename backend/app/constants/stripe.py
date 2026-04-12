"""Stripe integration constants."""

# Currency handling — Stripe uses lowercase ISO codes.
DEFAULT_CURRENCY = "thb"

# 100 satang = 1 THB. All monetary amounts are stored in satang and passed
# to Stripe in the smallest currency unit.
CURRENCY_SUBUNIT_MULTIPLIER = 100
