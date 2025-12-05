from app.api.endpoints.v1 import auth
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
