from typing import AsyncGenerator

from app.db.session import build_async_session


async def get_async_db() -> AsyncGenerator:
    session = None

    try:
        session = build_async_session()()

        yield session
    finally:
        if session:
            await session.close()
