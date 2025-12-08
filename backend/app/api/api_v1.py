from app.api.endpoints.v1 import auth, payments, posts, seller
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(posts.router)
api_router.include_router(seller.router)
api_router.include_router(payments.router)
