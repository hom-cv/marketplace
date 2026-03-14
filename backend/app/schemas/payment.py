"""Payment schemas for charge requests and responses."""

from datetime import datetime
from decimal import Decimal
from enum import Enum

from pydantic import BaseModel, Field, field_serializer


class PaymentMethodType(str, Enum):
    """Payment method types."""
    CARD = "card"
    PROMPTPAY = "promptpay"


class PriceBreakdown(BaseModel):
    """
    Price breakdown for an order.

    All monetary values are in THB.
    - platform_fee: 10% + VAT, deducted from seller
    - transfer_fee: Omise transfer fee per payout, deducted from seller
    - processing_fee: Omise rate + VAT, deducted from seller
    - total: what the buyer pays (item + shipping)
    - seller_payout: what the seller receives (total - all fees)
    """
    item_price: Decimal
    shipping_cost: Decimal
    platform_fee: Decimal
    transfer_fee: Decimal
    processing_fee: Decimal
    total_fees: Decimal
    total_vat: Decimal
    total: Decimal
    seller_payout: Decimal

    model_config = {"from_attributes": True}


class ShippingAddress(BaseModel):
    """Embedded shipping address for payment."""

    name: str = Field(..., description="Recipient name", max_length=100)
    phone: str = Field(..., description="Contact phone", max_length=20)
    address: str = Field(..., description="Street address")
    district: str = Field(..., description="District/Subdistrict", max_length=100)
    province: str = Field(..., description="Province", max_length=100)
    postal_code: str = Field(..., description="Postal code", max_length=10)


class CreateCardPaymentRequest(BaseModel):
    """Schema for creating a card payment."""

    post_id: int = Field(..., description="ID of the post to purchase")
    token: str = Field(..., description="Omise card token from frontend")
    return_uri: str = Field(..., description="URL to redirect after 3DS authentication")
    shipping: ShippingAddress = Field(..., description="Shipping address")


class CreatePromptPayPaymentRequest(BaseModel):
    """Schema for creating a PromptPay payment."""

    post_id: int = Field(..., description="ID of the post to purchase")
    return_uri: str = Field(..., description="URL to redirect after payment completion")
    shipping: ShippingAddress = Field(..., description="Shipping address")


class PaymentResponse(BaseModel):
    """Schema for payment response."""

    payment_id: int
    status: str
    charge_id: str | None = None
    authorize_uri: str | None = None  # For 3DS redirect
    qr_code_uri: str | None = None  # For PromptPay
    expires_at: datetime | None = None  # For PromptPay expiration


class PaymentStatusResponse(BaseModel):
    """Schema for checking payment status."""

    payment_id: int
    status: str
    amount: int
    currency: str
    payment_method: str
    paid_at: datetime | None = None
    failure_code: str | None = None
    failure_message: str | None = None

    model_config = {"from_attributes": True}


class PriceBreakdownResponse(PriceBreakdown):
    """Schema for price breakdown API response."""

    model_config = {
        "from_attributes": True,
        "ser_json_inf_nan": "constants",
    }

    @field_serializer('*', when_used='json')
    def serialize_decimal(self, value):
        if isinstance(value, Decimal):
            return str(value)
        return value


class PostSummary(BaseModel):
    """Embedded post information for purchase/sale items."""

    id: int
    title: str
    image_url: str | None = None
    price: str
    shipping_cost: str = "0"

    model_config = {"from_attributes": True}


class UserSummary(BaseModel):
    """Embedded user information for purchase/sale items."""

    id: int
    username: str

    model_config = {"from_attributes": True}


class PurchaseListItem(BaseModel):
    """Schema for a purchase or sale list item."""

    payment_id: int
    status: str
    amount: int  # In satang
    currency: str
    payment_method: str
    paid_at: datetime | None = None
    created_at: datetime
    post: PostSummary
    buyer: UserSummary | None = None  # For sales list
    seller: UserSummary | None = None  # For purchases list
    # Fee breakdown (all in satang)
    item_price: int | None = None
    shipping_cost: int | None = None
    platform_fee: int | None = None
    processing_fee: int | None = None
    total_fees: int | None = None
    total_vat: int | None = None
    seller_payout: int | None = None
    # Fulfillment tracking fields
    fulfillment_status: str | None = None
    tracking_number: str | None = None
    shipped_at: datetime | None = None
    delivered_at: datetime | None = None
    shipping_carrier: str | None = None
    # Shipping address (for seller to see)
    shipping_name: str | None = None
    shipping_phone: str | None = None
    shipping_address: str | None = None
    shipping_district: str | None = None
    shipping_province: str | None = None
    shipping_postal_code: str | None = None

    model_config = {"from_attributes": True}


class AddTrackingRequest(BaseModel):
    """Schema for adding tracking number to a sale."""

    carrier: str = Field(..., description="Carrier code: EMS, KEX, FLASH_EXPRESS, J_AND_T")
    tracking_number: str = Field(..., description="Tracking number", min_length=1, max_length=50)


class PayoutItem(BaseModel):
    """Schema for a payout list item."""

    payment_id: int
    seller_id: int
    seller_username: str
    buyer_username: str
    post_title: str
    amount: int
    seller_payout: int
    currency: str
    payment_method: str
    paid_at: datetime | None = None
    delivered_at: datetime | None = None

    model_config = {"from_attributes": True}


class PayoutListResponse(BaseModel):
    """Paginated list of pending payouts."""

    items: list[PayoutItem]
    total: int
    skip: int
    limit: int


class PayoutHistoryItem(PayoutItem):
    """Schema for a completed payout list item (extends PayoutItem)."""

    transferred_at: datetime | None = None
    omise_transfer_id: str | None = None


class PayoutHistoryListResponse(BaseModel):
    """Paginated list of completed payouts."""

    items: list[PayoutHistoryItem]
    total: int
    skip: int
    limit: int


class PayoutResponse(BaseModel):
    """Response after initiating a payout."""

    payment_id: int
    transfer_id: str
    amount: int
    status: str


class WebhookEventData(BaseModel):
    """Data payload within an Omise webhook event.

    This captures the common fields from charge/transfer objects.
    Additional fields can be accessed via the model's extra config.
    """

    id: str = Field(..., description="Omise object ID (e.g., chrg_xxx, trsf_xxx)")
    object: str = Field(..., description="Object type (charge, transfer, etc.)")
    status: str | None = Field(None, description="Object status")
    amount: int | None = Field(None, description="Amount in satang")
    currency: str | None = Field(None, description="Currency code")
    failure_code: str | None = Field(None, description="Failure code if failed")
    failure_message: str | None = Field(None, description="Failure message if failed")
    metadata: dict | None = Field(None, description="Metadata attached to the object")
    paid_at: datetime | None = Field(None, description="When payment was completed")

    model_config = {"extra": "allow"}


class WebhookEvent(BaseModel):
    """Omise webhook event payload.

    See: https://www.omise.co/webhooks
    """

    object: str = Field(default="event", description="Always 'event'")
    id: str = Field(..., description="Event ID")
    livemode: bool = Field(default=False, description="Whether this is live mode")
    key: str = Field(..., description="Event type key (e.g., charge.complete)")
    data: WebhookEventData = Field(..., description="Event data payload")
    created_at: datetime | None = Field(None, description="Event creation timestamp")

    model_config = {"extra": "allow"}


class WebhookResponse(BaseModel):
    """Response for webhook endpoints."""

    status: str = Field(..., description="Response status (ok or error)")
    message: str | None = Field(None, description="Optional error message")
