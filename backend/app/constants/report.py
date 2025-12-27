"""Report-related constants."""

from enum import auto

from app.core.utils import AutoName


class ReportReason(AutoName):
    """Report reason enumeration."""

    COUNTERFEIT = auto()
    ABUSE_OF_SYSTEM = auto()
    PROHIBITED_ITEM = auto()
    SCAM = auto()


class ReportStatus(AutoName):
    """Report status enumeration."""

    PENDING = auto()    # Awaiting review
    REVIEWED = auto()   # Seen by admin, no action yet
    RESOLVED = auto()   # Action taken
    DISMISSED = auto()  # Report rejected


class ReportType(AutoName):
    """Report type enumeration."""

    USER = auto()
    POST = auto()
