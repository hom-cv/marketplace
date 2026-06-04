import secrets

from fastapi import Depends, FastAPI, HTTPException, Request, status
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.responses import JSONResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials


def mount_protected_docs(app: FastAPI, username: str, password: str) -> None:
    """Mount /docs, /redoc, and /openapi.json behind HTTP Basic Auth.

    The caller is responsible for constructing `app` with
    `docs_url=None, redoc_url=None, openapi_url=None` so the built-in
    routes don't shadow these.
    """
    realm = "Tallad API docs"
    basic = HTTPBasic(realm=realm)
    expected_user = username.encode("utf-8")
    expected_pass = password.encode("utf-8")

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
                headers={"WWW-Authenticate": f'Basic realm="{realm}"'},
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
