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
    POSTGRES_SSLMODE: str | None = None

    POSTGRES_URI: str | None = None
    ALEMBIC_URI: str | None = None

    JWT_SECRET_KEY: str

    SENDGRID_API_KEY: str
    SENDGRID_FROM_EMAIL: str

    BASE_URL: str

    # Omise configuration
    OMISE_PUBLIC_KEY: str
    OMISE_SECRET_KEY: str
    OMISE_WEBHOOK_SECRET: str | None = None
    OMISE_CONNECT_ENABLED: bool = False  # Enable when Omise Connect is set up

    # Digital Ocean Spaces (optional - for image uploads)
    DO_SPACES_KEY: str | None = None
    DO_SPACES_SECRET: str | None = None
    DO_SPACES_BUCKET: str | None = None
    DO_SPACES_REGION: str | None = None

    # Transaction fees (percentages)
    PLATFORM_FEE_PERCENT: Decimal = Decimal("10.0")  # Platform fee to us
    VAT_PERCENT: Decimal = Decimal("7.0")  # VAT on item price

    # Payment processing fees (Omise fees passed to buyer)
    CARD_PROCESSING_FEE_PERCENT: Decimal = Decimal("3.65")  # Credit card processing fee
    PROMPTPAY_PROCESSING_FEE_PERCENT: Decimal = Decimal(
        "1.65"
    )  # PromptPay processing fee
    PROCESSING_FEE_VAT_PERCENT: Decimal = Decimal("7.0")  # VAT on processing fees

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
            if self.POSTGRES_SSLMODE:
                uri = f"{uri}?ssl={self.POSTGRES_SSLMODE}"
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
