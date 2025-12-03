from functools import lru_cache
from typing import Self
from urllib import parse

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

    POSTGRES_URI: str | None = None
    ALEMBIC_URI: str | None = None

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
            )
            self.POSTGRES_URI = str(dsn)

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
            )
            self.ALEMBIC_URI = str(dsn)

        return self


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore
