"""Follow API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Path, status

from app.core.security import get_current_user
from app.models import User
from app.services.follow_service import AnnotatedFollowService

router = APIRouter(prefix="/follows", tags=["follows"])


@router.post(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def follow_user(
    follow_service: AnnotatedFollowService,
    current_user: Annotated[User, Depends(get_current_user)],
    user_id: Annotated[int, Path()],
) -> None:
    """
    Follow a user.

    If already following, does nothing (idempotent).
    Requires authentication.
    """
    await follow_service.follow_user(
        follower_id=current_user.id, following_id=user_id
    )


@router.delete(
    "/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unfollow_user(
    follow_service: AnnotatedFollowService,
    current_user: Annotated[User, Depends(get_current_user)],
    user_id: Annotated[int, Path()],
) -> None:
    """
    Unfollow a user.

    If not following, does nothing (idempotent).
    Requires authentication.
    """
    await follow_service.unfollow_user(
        follower_id=current_user.id, following_id=user_id
    )
