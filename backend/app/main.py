from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.api_v1 import api_router as v1_router
from app.core.settings import get_settings


def init_routers(app: FastAPI) -> None:
    app.include_router(v1_router)


def create_app() -> FastAPI:
    settings = get_settings()

    app_ = FastAPI(
        title="AppName",  # TODO: Name application
        description="API for AppName",  # TODO: Name application
        version="0.1.0-alpha",
    )

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
        return {"status": "ok", "service": "AppName"}

    init_routers(app=app_)

    return app_


app = create_app()

