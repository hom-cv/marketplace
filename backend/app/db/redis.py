"""Redis client utility for WebSocket pub/sub.

Lifecycle is managed via app lifespan events in main.py:
  - init_redis() at startup
  - close_redis() at shutdown

For request-scoped dependency injection, use get_redis_dep with Depends().
For non-request contexts (e.g., ConnectionManager singleton), use get_redis().
"""

from collections.abc import AsyncGenerator

from redis.asyncio import Redis

from app.core.settings import get_settings

_redis: Redis | None = None


async def init_redis() -> None:
    """Initialize the Redis connection. Call once at app startup."""
    global _redis
    settings = get_settings()
    _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)


async def get_redis() -> Redis:
    """Get the Redis connection. Raises if not initialized."""
    if _redis is None:
        raise RuntimeError("Redis not initialized. Call init_redis() at app startup.")
    return _redis


async def get_redis_dep() -> AsyncGenerator[Redis, None]:
    """FastAPI dependency that yields the Redis client."""
    yield await get_redis()


async def close_redis() -> None:
    """Close the Redis connection. Call once at app shutdown."""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
