import secrets

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials

from app.core.settings import Settings


def mount_protected_docs(app: FastAPI, settings: Settings) -> None:
    """Mount /docs, /redoc, and /openapi.json behind HTTP Basic Auth.

    The caller is responsible for constructing `app` with
    `docs_url=None, redoc_url=None, openapi_url=None` so the built-in
    routes don't shadow these.
    """
    if not (settings.DOCS_USERNAME and settings.DOCS_PASSWORD):
        raise RuntimeError(
            "mount_protected_docs requires DOCS_USERNAME and DOCS_PASSWORD to be set"
        )

    basic = HTTPBasic()
    expected_user = settings.DOCS_USERNAME.encode("utf-8")
    expected_pass = settings.DOCS_PASSWORD.encode("utf-8")

    def _verify(credentials: HTTPBasicCredentials = Depends(basic)) -> None:
        ok_user = secrets.compare_digest(
            credentials.username.encode("utf-8"), expected_user
        )
        ok_pass = secrets.compare_digest(
            credentials.password.encode("utf-8"), expected_pass
        )
        if not (ok_user and ok_pass):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Unauthorized",
                headers={"WWW-Authenticate": "Basic"},
            )

    def _openapi_url(request: Request) -> str:
        root_path = request.scope.get("root_path", "").rstrip("/")
        return f"{root_path}/openapi.json"

    @app.get("/openapi.json", include_in_schema=False)
    async def openapi(_: None = Depends(_verify)):
        return JSONResponse(app.openapi())

    @app.get("/docs", include_in_schema=False)
    async def docs(request: Request, _: None = Depends(_verify)):
        return get_swagger_ui_html(
            openapi_url=_openapi_url(request), title="Tallad — docs"
        )

    @app.get("/redoc", include_in_schema=False)
    async def redoc(request: Request, _: None = Depends(_verify)):
        return get_redoc_html(
            openapi_url=_openapi_url(request), title="Tallad — redoc"
        )
