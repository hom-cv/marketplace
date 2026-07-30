from fastapi import APIRouter

from app.api.endpoints.v1 import (
    admin,
    auth,
    brands,
    categories,
    feedback,
    follows,
    invites,
    likes,
    messages,
    payments,
    posts,
    reports,
    seller,
    users,
)

api_router = APIRouter(prefix="/api/v1")

api_router.include_router(auth.router)
api_router.include_router(posts.router)
api_router.include_router(brands.router)
api_router.include_router(categories.router)
api_router.include_router(likes.router)
api_router.include_router(follows.router)
api_router.include_router(feedback.router)
api_router.include_router(seller.router)
api_router.include_router(payments.router)
api_router.include_router(invites.router)
api_router.include_router(reports.router)
api_router.include_router(admin.router)
api_router.include_router(users.router)
api_router.include_router(messages.router)
