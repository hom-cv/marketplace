from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1 import api_router as v1_router
from app.core.docs import mount_protected_docs
from app.core.settings import get_settings
from app.db.redis import close_redis, init_redis


def init_routers(app: FastAPI) -> None:
    app.include_router(v1_router)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application-wide resources."""
    await init_redis()
    yield
    await close_redis()


def create_app() -> FastAPI:
    settings = get_settings()

    fastapi_kwargs: dict = {
        "title": "Tallad",
        "description": "API for Tallad",
        "version": "0.1.0-alpha",
        "lifespan": lifespan,
    }
    if settings.is_production:
        fastapi_kwargs |= {"docs_url": None, "redoc_url": None, "openapi_url": None}

    app_ = FastAPI(**fastapi_kwargs)

    if settings.is_production:
        mount_protected_docs(app_, settings)

    # CORS middleware for frontend
    app_.add_middleware(
        CORSMiddleware,
        allow_origins=[settings.BASE_URL],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app_.get("/health", tags=["Monitoring"])
    async def health_check():
        """
        A simple endpoint to check the application's health.
        Returns a 200 OK status if the application is running.
        """
        return {"status": "ok", "service": "Tallad"}

    init_routers(app=app_)

    return app_


app = create_app()

