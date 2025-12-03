from fastapi import FastAPI


def create_app() -> FastAPI:
    app_ = FastAPI(
        title="AppName",  # TODO: Name application
        description="API for AppName",  # TODO: Name application
        version="0.1.0-alpha",
    )

    @app_.get("/health", tags=["Monitoring"])
    async def health_check():
        """
        A simple endpoint to check the application's health.
        Returns a 200 OK status if the application is running.
        """
        return {"status": "ok", "service": "AppName"}

    return app_


app = create_app()
