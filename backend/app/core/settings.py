from decimal import Decimal
from functools import lru_cache
from typing import Annotated, Self
from urllib import parse

from fastapi import Depends
from pydantic import PostgresDsn, model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """
    Settings from .env file
    """

    POSTGRES_HOST: str
    POSTGRES_USER: str
    POSTGRES_PASSWORD: str
    POSTGRES_DB: str
    POSTGRES_PORT: int
    POSTGRES_SSLMODE: str = "require"

    POSTGRES_URI: str | None = None
    ALEMBIC_URI: str | None = None

    JWT_SECRET_KEY: str

    SENDGRID_API_KEY: str
    SENDGRID_FROM_EMAIL: str

    REDIS_URL: str = "redis://localhost:6379"

    BASE_URL: str

    ENVIRONMENT: str = "development"
    DOCS_USERNAME: str | None = None
    DOCS_PASSWORD: str | None = None

    # Stripe configuration
    STRIPE_SECRET_KEY: str
    STRIPE_PUBLISHABLE_KEY: str
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_CONNECT_WEBHOOK_SECRET: str | None = None
    STRIPE_CONNECT_RETURN_URL: str
    STRIPE_CONNECT_REFRESH_URL: str
    STRIPE_API_VERSION: str = "2025-11-17.clover"

    # Digital Ocean Spaces (optional - for image uploads)
    DO_SPACES_KEY: str | None = None
    DO_SPACES_SECRET: str | None = None
    DO_SPACES_BUCKET: str | None = None
    DO_SPACES_REGION: str | None = None

    # Transaction fees (percentages) — all on seller side
    PLATFORM_FEE_PERCENT: Decimal = Decimal("10.0")  # Seller-side platform fee
    VAT_PERCENT: Decimal = Decimal("7.0")  # VAT on fees

    # Payment processing fees (Stripe Thailand rates — verify from Stripe dashboard)
    CARD_PROCESSING_FEE_PERCENT: Decimal = Decimal("3.65")  # Thai cards percentage
    CARD_PROCESSING_FEE_FIXED_THB: Decimal = Decimal("10.0")  # Fixed per-charge fee
    PROMPTPAY_PROCESSING_FEE_PERCENT: Decimal = Decimal("2.0")  # PromptPay percentage
    PROMPTPAY_PROCESSING_FEE_FIXED_THB: Decimal = Decimal(
        "10.0"
    )  # PromptPay fixed per-charge fee (set to 0 if none)
    PROCESSING_FEE_VAT_PERCENT: Decimal = Decimal("7.0")  # VAT on processing fees
    MIN_PAYOUT_AMOUNT_SATANG: int = 200  # Stripe minimum transfer amount (2 THB)

    RESERVATION_DURATION_MINUTES: int = 10

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT == "production"

    @property
    def docs_credentials(self) -> tuple[str, str] | None:
        if self.DOCS_USERNAME and self.DOCS_PASSWORD:
            return self.DOCS_USERNAME, self.DOCS_PASSWORD
        return None

    @model_validator(mode="after")
    def require_docs_credentials_in_production(self) -> Self:
        if self.is_production and self.docs_credentials is None:
            raise ValueError(
                "DOCS_USERNAME and DOCS_PASSWORD must be set when ENVIRONMENT=production"
            )
        return self

    @property
    def do_spaces_endpoint(self) -> str:
        """Get the DO Spaces endpoint URL."""
        return f"https://{self.DO_SPACES_REGION}.digitaloceanspaces.com"

    @property
    def do_spaces_cdn_url(self) -> str:
        """Get the CDN URL for accessing uploaded files."""
        return f"https://{self.DO_SPACES_BUCKET}.{self.DO_SPACES_REGION}.cdn.digitaloceanspaces.com"

    @model_validator(mode="after")
    def assemble_db_connection(self) -> Self:
        """
        Building database connection for database operations
        """
        if not isinstance(self.POSTGRES_URI, str):
            dsn = PostgresDsn.build(  # type: ignore
                scheme="postgresql+asyncpg",
                username=self.POSTGRES_USER,
                password=parse.quote(self.POSTGRES_PASSWORD),
                host=self.POSTGRES_HOST,
                path=self.POSTGRES_DB,
                port=self.POSTGRES_PORT,
            )
            uri = str(dsn)
            self.POSTGRES_URI = uri

        return self

    @model_validator(mode="after")
    def assemble_alembic_db_connection(self) -> Self:
        """
        Building database connection for alembic to generate migrations
        """
        if not isinstance(self.ALEMBIC_URI, str):
            dsn = PostgresDsn.build(  # type: ignore
                scheme="postgresql",
                username=self.POSTGRES_USER,
                password=parse.quote(self.POSTGRES_PASSWORD),
                host=self.POSTGRES_HOST,
                path=self.POSTGRES_DB,
                port=self.POSTGRES_PORT,
            )
            uri = str(dsn)
            if self.POSTGRES_SSLMODE:
                uri = f"{uri}?sslmode={self.POSTGRES_SSLMODE}"
            self.ALEMBIC_URI = uri

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore

AnnotatedSettings = Annotated[Settings, Depends(get_settings)]
