import ssl
from functools import lru_cache

from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.core.settings import Settings, get_settings

settings: Settings = get_settings()


def _get_ssl_context() -> ssl.SSLContext | None:
    """
    Create SSL context for database connection.
    Required for DigitalOcean managed databases.
    """
    if settings.POSTGRES_SSLMODE and settings.POSTGRES_SSLMODE != "disable":
        # Create SSL context that doesn't verify certificates
        # (DigitalOcean managed databases use self-signed certs)
        ssl_context = ssl.create_default_context()
        ssl_context.check_hostname = False
        ssl_context.verify_mode = ssl.CERT_NONE
        return ssl_context
    return None


# async
# https://docs.sqlalchemy.org/en/14/orm/extensions/asyncio.html#synopsis-orm
@lru_cache
def build_async_engine() -> AsyncEngine:
    """
    SQLAlchemy asynchronous database engine.

    Ref: https://docs.pydantic.dev/latest/usage/serialization/#custom-serializers
    """
    connect_args: dict = {}
    
    # Add SSL context if SSL is enabled
    ssl_context = _get_ssl_context()
    if ssl_context:
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
