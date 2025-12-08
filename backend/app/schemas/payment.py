"""Payment schemas for charge requests and responses."""

from datetime import datetime

from pydantic import BaseModel, Field


class CreateCardPaymentRequest(BaseModel):
    """Schema for creating a card payment."""

    post_id: int = Field(..., description="ID of the post to purchase")
    token: str = Field(..., description="Omise card token from frontend")
    return_uri: str = Field(..., description="URL to redirect after 3DS authentication")


class CreatePromptPayPaymentRequest(BaseModel):
    """Schema for creating a PromptPay payment."""

    post_id: int = Field(..., description="ID of the post to purchase")
    return_uri: str = Field(..., description="URL to redirect after payment completion")


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


class WebhookEventData(BaseModel):
    """Schema for Omise webhook event payload."""

    object: str
    id: str
    livemode: bool
    location: str | None = None

    model_config = {"extra": "allow"}  # Allow additional fields from Omise


class WebhookEvent(BaseModel):
    """Schema for Omise webhook event."""

    object: str
    id: str
    livemode: bool
    key: str
    data: WebhookEventData

    model_config = {"extra": "allow"}
