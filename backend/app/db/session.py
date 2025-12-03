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
    return create_async_engine(
        url=str(settings.POSTGRES_URI),
        pool_pre_ping=True,
    )


@lru_cache
def build_async_session() -> async_sessionmaker[AsyncSession]:
    return async_sessionmaker(
        build_async_engine(), expire_on_commit=False, class_=AsyncSession
    )
