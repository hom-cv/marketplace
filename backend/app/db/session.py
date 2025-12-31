import ssl
from functools import lru_cache

from app.core.settings import Settings, get_settings
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

settings: Settings = get_settings()


# async
# https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html#synopsis-orm
@lru_cache
def build_async_engine() -> AsyncEngine:
    """
    SQLAlchemy asynchronous database engine.

    Ref: https://docs.pydantic.dev/latest/usage/serialization/#custom-serializers
    """
    connect_args = {}
    if settings.POSTGRES_SSLMODE == "true":
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        connect_args["ssl"] = ssl_context

    return create_async_engine(
        url=str(settings.POSTGRES_URI),
        pool_pre_ping=True,
        connect_args=connect_args,
    )


@lru_cache
def build_async_session() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        build_async_engine(), expire_on_commit=False, class_=AsyncSession
    )
