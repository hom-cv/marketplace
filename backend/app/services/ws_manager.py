"""WebSocket connection manager with Redis pub/sub for cross-instance delivery."""

import asyncio
import json
import logging
import time

from fastapi import WebSocket

from app.constants.message import WS_RATE_LIMIT_MAX_TOKENS, WS_RATE_LIMIT_REFILL_SECONDS
from app.db.redis import get_redis

logger = logging.getLogger(__name__)


class RateLimiter:
    """Token bucket rate limiter for per-connection message throttling."""

    def __init__(self, max_tokens: int, refill_seconds: float) -> None:
        self._max_tokens = max_tokens
        self._tokens = float(max_tokens)
        self._refill_rate = max_tokens / refill_seconds
        self._last_refill = time.monotonic()

    def consume(self) -> bool:
        """Try to consume one token. Returns True if allowed, False if rate limited."""
        now = time.monotonic()
        elapsed = now - self._last_refill
        self._tokens = min(self._max_tokens, self._tokens + elapsed * self._refill_rate)
        self._last_refill = now

        if self._tokens >= 1.0:
            self._tokens -= 1.0
            return True
        return False


class ConnectionManager:
    """
    Manages WebSocket connections with Redis pub/sub for multi-instance support.

    Each user has a Redis channel: chat:user:{user_id}
    When sending to a user, the message is published to their Redis channel.
    The instance where that user is connected receives it via subscription
    and pushes via WebSocket locally.
    """

    def __init__(self) -> None:
        self._connections: dict[int, set[WebSocket]] = {}
        self._subscriptions: dict[int, asyncio.Task] = {}
        self._rate_limiters: dict[int, RateLimiter] = {}

    async def connect(self, user_id: int, websocket: WebSocket) -> None:
        """Register an already-accepted WebSocket and start Redis subscription."""
        if user_id not in self._connections:
            self._connections[user_id] = set()
            self._rate_limiters[user_id] = RateLimiter(
                WS_RATE_LIMIT_MAX_TOKENS, WS_RATE_LIMIT_REFILL_SECONDS
            )
            self._subscriptions[user_id] = asyncio.create_task(
                self._listen(user_id)
            )
        self._connections[user_id].add(websocket)

    async def disconnect(self, user_id: int, websocket: WebSocket) -> None:
        """Remove connection and clean up subscription when no connections remain."""
        conns = self._connections.get(user_id)
        if conns is not None:
            conns.discard(websocket)
            if not conns:
                await self._cleanup(user_id)

    def get_rate_limiter(self, user_id: int) -> RateLimiter | None:
        """Get the shared rate limiter for a user."""
        return self._rate_limiters.get(user_id)

    async def send_to_user(self, user_id: int, data: dict) -> None:
        """Publish message to Redis channel for the target user."""
        try:
            redis = await get_redis()
            await redis.publish(f"chat:user:{user_id}", json.dumps(data))
        except Exception:
            logger.exception("Failed to publish message to Redis for user %s", user_id)

    async def _listen(self, user_id: int) -> None:
        """Subscribe to Redis channel and push messages to local WebSocket."""
        try:
            redis = await get_redis()
            pubsub = redis.pubsub()
            await pubsub.subscribe(f"chat:user:{user_id}")

            async for raw_message in pubsub.listen():
                if raw_message["type"] == "message":
                    conns = list(self._connections.get(user_id, ()))
                    if conns:
                        await asyncio.gather(
                            *(ws.send_text(raw_message["data"]) for ws in conns),
                            return_exceptions=True,
                        )
        except asyncio.CancelledError:
            pass
        except Exception:
            logger.exception("Redis listener error for user %s", user_id)
        finally:
            try:
                await pubsub.unsubscribe(f"chat:user:{user_id}")
                await pubsub.close()
            except Exception:
                pass

    async def _cleanup(self, user_id: int) -> None:
        """Clean up connection, rate limiter, and subscription for a user."""
        self._connections.pop(user_id, None)
        self._rate_limiters.pop(user_id, None)
        task = self._subscriptions.pop(user_id, None)
        if task:
            task.cancel()
            try:
                await task
            except asyncio.CancelledError:
                pass


# Singleton instance
manager = ConnectionManager()
