"""User profile API endpoints."""

from typing import Annotated, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies.user import AnnotatedValidUserByUsername
from app.core.security import get_current_user, get_current_user_optional
from app.crud.feedback import AnnotatedFeedbackCRUD
from app.crud.follow import AnnotatedFollowCRUD
from app.crud.like import AnnotatedLikeCRUD
from app.crud.payment import AnnotatedPaymentCRUD
from app.crud.post import AnnotatedPostCRUD
from app.db.utils import get_async_db
from app.models import Post, User
from app.schemas.feedback import FeedbackResponseSchema
from app.schemas.post import PostResponseSchema
from app.schemas.user import (
    PublicUserProfileSchema,
    UserProfileUpdateSchema,
    UserResponseSchema,
)
from app.services.user_service import AnnotatedUserService

router = APIRouter(prefix="/users", tags=["users"])


@router.get(
    "/{username}",
    status_code=status.HTTP_200_OK,
    response_model=PublicUserProfileSchema,
)
async def get_user_profile(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    like_crud: AnnotatedLikeCRUD,
    follow_crud: AnnotatedFollowCRUD,
    payment_crud: AnnotatedPaymentCRUD,
    feedback_crud: AnnotatedFeedbackCRUD,
    user: AnnotatedValidUserByUsername,
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
) -> PublicUserProfileSchema:
    """
    Get a user's public profile by username.

    Returns the user's profile including:
    - Username (always shown)
    - First/last name (only if user has show_full_name enabled)
    - Bio
    - Total likes across all their posts
    - Seller status
    - Follower count
    - Whether the current user is following this profile (if authenticated)
    """
    # Get total likes for this user's posts
    total_likes = await like_crud.get_total_likes_for_user(db, user_id=user.id)

    # Get follower count
    follower_count = await follow_crud.get_follower_count(db, user_id=user.id)

    # Get completed transaction count (successful sales as a seller)
    completed_sales = await payment_crud.get_completed_sales_count(
        db, seller_id=user.id
    )

    # Get feedback rating summary (average + count)
    rating, feedback_count = await feedback_crud.get_rating_summary(
        db, seller_id=user.id
    )

    # Check if current user is following this profile
    is_followed = False
    if current_user and current_user.id != user.id:
        is_followed = await follow_crud.is_following(
            db, follower_id=current_user.id, following_id=user.id
        )

    return PublicUserProfileSchema.from_user(
        user,
        total_likes,
        follower_count=follower_count,
        completed_sales=completed_sales,
        rating=rating,
        feedback_count=feedback_count,
        is_followed=is_followed,
    )


@router.get(
    "/{username}/posts",
    status_code=status.HTTP_200_OK,
    response_model=list[PostResponseSchema],
)
async def get_user_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud: AnnotatedPostCRUD,
    like_crud: AnnotatedLikeCRUD,
    user: AnnotatedValidUserByUsername,
    current_user: Annotated[Optional[User], Depends(get_current_user_optional)] = None,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[PostResponseSchema]:
    """
    Get a user's public posts by username.

    Returns non-deleted posts with like counts.
    If authenticated, also includes is_liked status for each post.
    """
    posts = await post_crud.get_by_user_id(db, user_id=user.id, skip=skip, limit=limit)

    post_ids = [p.id for p in posts]
    like_data: dict[int, dict] = {}
    if post_ids:
        like_data = await like_crud.get_likes_for_posts(
            db,
            post_ids=post_ids,
            user_id=current_user.id if current_user else None,
        )

    def _build_post_response(post: Post, all_like_data: dict) -> PostResponseSchema:
        response = PostResponseSchema.model_validate(post)
        post_like_info = all_like_data.get(post.id, {})
        response.like_count = post_like_info.get("count", 0)
        response.is_liked = post_like_info.get("is_liked", False)
        return response

    return [_build_post_response(p, like_data) for p in posts]


@router.get(
    "/{username}/feedback",
    status_code=status.HTTP_200_OK,
    response_model=list[FeedbackResponseSchema],
)
async def get_user_feedback(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    feedback_crud: AnnotatedFeedbackCRUD,
    user: AnnotatedValidUserByUsername,
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> list[FeedbackResponseSchema]:
    """Get feedback a seller has received, newest first."""
    feedback = await feedback_crud.get_for_seller(
        db, seller_id=user.id, skip=skip, limit=limit
    )
    return [FeedbackResponseSchema.from_feedback(f) for f in feedback]


@router.patch(
    "/me/profile",
    status_code=status.HTTP_200_OK,
    response_model=UserResponseSchema,
)
async def update_my_profile(
    user_service: AnnotatedUserService,
    current_user: Annotated[User, Depends(get_current_user)],
    profile_data: UserProfileUpdateSchema,
) -> UserResponseSchema:
    """
    Update the current user's profile.

    Allows updating:
    - username: Unique username (alphanumeric/underscore, stored lowercase)
    - first_name / last_name: Display name
    - bio: User's bio text (max 500 chars)
    - show_full_name: Whether to show full name on public profile
    """
    updated_user = await user_service.update_profile(
        user=current_user,
        profile_data=profile_data,
    )

    return UserResponseSchema.from_user(updated_user)
