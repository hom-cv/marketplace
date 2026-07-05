"""Payment-related constants."""

from enum import Enum


class PaymentMethod(str, Enum):
    """Payment method. Shared by the API schema and the ORM model.

    value = Stripe/API token (lowercase); SQLAlchemy persists the member NAME
    (uppercase) to the DB, so one enum serves both representations.
    """

    CARD = "card"
    PROMPTPAY = "promptpay"
