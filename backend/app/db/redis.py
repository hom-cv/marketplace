"""Redis client utility for WebSocket pub/sub."""

from redis.asyncio import Redis

from app.core.settings import get_settings

_redis: Redis | None = None


async def get_redis() -> Redis:
    """Get or create a Redis connection."""
    global _redis
    if _redis is None:
        settings = get_settings()
        _redis = Redis.from_url(settings.REDIS_URL, decode_responses=True)
    return _redis


async def close_redis() -> None:
    """Close the Redis connection."""
    global _redis
    if _redis:
        await _redis.close()
        _redis = None
