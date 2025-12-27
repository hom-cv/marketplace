"""Invite-related constants."""

from enum import auto

from app.core.utils import AutoName


class InviteStatus(AutoName):
    """Invite code status enumeration."""

    ACTIVE = auto()   # Available for use
    USED = auto()     # Already redeemed
    REVOKED = auto()  # Manually revoked by admin
