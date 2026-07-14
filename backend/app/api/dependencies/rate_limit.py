"""Redis-backed rate limiting dependencies."""

import time
from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis

from app.core.exceptions import too_many_requests_error
from app.core.security import get_current_user
from app.core.settings import AnnotatedSettings
from app.db.redis import get_redis_dep
from app.models import User


async def enforce_presign_rate_limit(
    current_user: Annotated[User, Depends(get_current_user)],
    settings: AnnotatedSettings,
    redis: Annotated[Redis, Depends(get_redis_dep)],
) -> None:
    """Cap how many presigned upload URLs a user may mint per minute.

    Fixed-window counter keyed by user + epoch-minute; the key self-expires, so
    no cleanup is needed.

    # ponytail: fixed window per minute; move to a sliding window only if
    # boundary bursts (up to ~2x the limit across a window edge) matter.

    Raises:
        HTTPException: 429 once the per-minute limit is exceeded.
    """
    window = int(time.time()) // 60
    key = f"presign:{current_user.id}:{window}"

    async with redis.pipeline(transaction=True) as pipe:
        pipe.incr(key)
        pipe.expire(key, 60)
        count, _ = await pipe.execute()

    if count > settings.PRESIGN_RATE_LIMIT_PER_MINUTE:
        raise too_many_requests_error(
            "Too many upload requests. Please slow down and try again shortly."
        )
