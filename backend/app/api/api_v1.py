from app.api.endpoints.v1 import admin, auth, invites, likes, payments, posts, reports, seller
from fastapi import APIRouter

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(posts.router)
api_router.include_router(likes.router)
api_router.include_router(seller.router)
api_router.include_router(payments.router)
api_router.include_router(invites.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)

