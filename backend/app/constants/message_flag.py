"""Message flag constants."""

from enum import auto

from app.core.utils import AutoName


class MessageFlagStatus(AutoName):
    """Status of a flagged message."""

    PENDING = auto()    # Awaiting admin review
    DISMISSED = auto()  # Admin dismissed the flag
