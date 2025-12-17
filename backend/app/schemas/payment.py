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
    """Price breakdown for an order."""
    item_price: Decimal
    shipping_cost: Decimal
    vat_amount: Decimal
    processing_fee: Decimal
    platform_fee: Decimal
    total: Decimal
    seller_payout: Decimal
    total_fees: Decimal
    vat_percent: float
    processing_fee_percent: float
    platform_fee_percent: float

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
    """Schema for price breakdown calculation."""

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
    vat_amount: int | None = None
    processing_fee: int | None = None
    platform_fee: int | None = None
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

    carrier: str = Field(..., description="Shipping carrier: EMS, KEX, FLASH_EXPRESS, or J_AND_T")
    tracking_number: str = Field(..., description="Shipping tracking number", min_length=1, max_length=100)


class WebhookResponse(BaseModel):
    """Response for webhook processing."""

    status: str
    message: str | None = None


class WebhookEventData(BaseModel):
    """Schema for Omise webhook event payload."""

    object: str
    id: str
    livemode: bool
    location: str | None = None

    model_config = {"extra": "allow"}


class WebhookEvent(BaseModel):
    """Schema for Omise webhook event."""

    object: str
    id: str
    livemode: bool
    key: str
    data: WebhookEventData

    model_config = {"extra": "allow"}
