from fastapi import FastAPI


def create_app() -> FastAPI:
    app_ = FastAPI(
        title="AppName",  # TODO: Name application
        description="API for AppName",  # TODO: Name application
        version="0.1.0-alpha",
    )

    return app_


app = create_app()
