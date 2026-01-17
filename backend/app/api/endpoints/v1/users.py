"""User profile API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error
from app.core.security import get_current_user
from app.crud.like import AnnotatedLikeCRUD
from app.crud.post import AnnotatedPostCRUD
from app.crud.user import AnnotatedUserCRUD
from app.db.utils import get_async_db
from app.models import User
from app.schemas.post import PostResponseSchema
from app.schemas.user import (
    PublicUserProfileSchema,
    UserProfileUpdateSchema,
    UserResponseSchema,
)

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/{username}",
    status_code=status.HTTP_200_OK,
    response_model=PublicUserProfileSchema,
)
async def get_user_profile(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    like_crud: AnnotatedLikeCRUD,
    user_crud: AnnotatedUserCRUD,
    username: str,
) -> PublicUserProfileSchema:
    """
    Get a user's public profile by username.

    Returns the user's profile including:
    - Username (always shown)
    - First/last name (only if user has show_full_name enabled)
    - Bio
    - Total likes across all their posts
    - Seller status
    """
    user = await user_crud.get_by_username_with_relations(db, username=username)

    if not user:
        raise not_found_error("User not found")

    # Get total likes for this user's posts
    total_likes = await like_crud.get_total_likes_for_user(db, user_id=user.id)

    # Determine if name should be shown based on user's privacy setting
    return PublicUserProfileSchema.from_user(user, total_likes)


@router.get(
    "/{username}/posts",
    status_code=status.HTTP_200_OK,
    response_model=list[PostResponseSchema],
)
async def get_user_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud: AnnotatedPostCRUD,
    like_crud: AnnotatedLikeCRUD,
    user_crud: AnnotatedUserCRUD,
    username: str,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PostResponseSchema]:
    """
    Get a user's public posts by username.

    Returns non-deleted posts with like counts.
    """
    user = await user_crud.get_by_username(db, username=username)

    if not user:
        raise not_found_error("User not found")

    posts = await post_crud.get_by_user_id(db, user_id=user.id, skip=skip, limit=limit)

    # Get like data for posts
    post_ids = [p.id for p in posts]
    like_data: dict = {}
    if post_ids:
        like_data = await like_crud.get_likes_for_posts(db, post_ids=post_ids)

    # Build response
    result = []
    for post in posts:
        response = PostResponseSchema.model_validate(post)
        post_like_info = like_data.get(post.id, {})
        response.like_count = post_like_info.get("count", 0)
        result.append(response)

    return result


@router.patch(
    "/me/profile",
    status_code=status.HTTP_200_OK,
    response_model=UserResponseSchema,
)
async def update_my_profile(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    user_crud: AnnotatedUserCRUD,
    profile_data: UserProfileUpdateSchema,
) -> UserResponseSchema:
    """
    Update the current user's profile.

    Allows updating:
    - bio: User's bio text (max 500 chars)
    - show_full_name: Whether to show full name on public profile
    """
    updated_user = await user_crud.update_profile(
        db,
        user=current_user,
        bio=profile_data.bio,
        show_full_name=profile_data.show_full_name,
    )

    return UserResponseSchema.from_user(updated_user)
