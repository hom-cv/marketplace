"""Payment-related constants."""

from enum import Enum


class PaymentMethod(str, Enum):
    """Payment method. Shared by the API schema and the ORM model.

    ``value`` is the Stripe/API token, and the column persists that same value
    (see ``values_callable`` on the model), so DB == value == API everywhere.
    """

    CARD = "card"
    PROMPTPAY = "promptpay"
