"""Likes API endpoints for the marketplace."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.dependencies import AnnotatedValidPost
from app.core.security import get_current_user
from app.crud.like import LikeCRUD, get_like_crud, AnnotatedLikeCRUD
from app.db.utils import get_async_db
from app.models import User
from app.schemas.like import LikedPostsResponse
from app.schemas.post import PostResponseSchema

router = APIRouter(prefix="/likes", tags=["likes"])


@router.post(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def like_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    like_crud_dep: AnnotatedLikeCRUD,
    current_user: Annotated[User, Depends(get_current_user)],
    post: AnnotatedValidPost,
) -> None:
    """
    Like a post.

    If the post is already liked, does nothing.
    Returns 204 No Content. Frontend should refetch post data for updated like info.
    Requires authentication.
    """
    await like_crud_dep.like_post(db, user_id=current_user.id, post_id=post.id)


@router.delete(
    "/{post_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
async def unlike_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    like_crud_dep: AnnotatedLikeCRUD,
    current_user: Annotated[User, Depends(get_current_user)],
    post: AnnotatedValidPost,
) -> None:
    """
    Unlike a post.

    If the post is not liked, does nothing.
    Returns 204 No Content. Frontend should refetch post data for updated like info.
    Requires authentication.
    """
    await like_crud_dep.unlike_post(db, user_id=current_user.id, post_id=post.id)


@router.get(
    "/me",
    status_code=status.HTTP_200_OK,
    response_model=LikedPostsResponse,
)
async def get_my_liked_posts(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    like_crud_dep: AnnotatedLikeCRUD,
    current_user: Annotated[User, Depends(get_current_user)],
    skip: Annotated[int, Query(ge=0)] = 0,
    limit: Annotated[int, Query(ge=1, le=100)] = 50,
) -> LikedPostsResponse:
    """
    Get current user's liked posts with pagination.

    Requires authentication.
    """
    posts, total = await like_crud_dep.get_user_liked_posts(
        db, user_id=current_user.id, skip=skip, limit=limit
    )

    # Convert to response schema
    items = [PostResponseSchema.model_validate(post) for post in posts]

    # Mark all as liked since these are user's liked posts
    # Also get like counts in batch
    post_ids = [p.id for p in posts]
    if post_ids:
        like_data = await like_crud_dep.get_likes_for_posts(
            db, post_ids=post_ids, user_id=current_user.id
        )
        for item in items:
            item.is_liked = True
            item.like_count = like_data.get(item.id, {}).get("count", 0)

    return LikedPostsResponse(
        items=items,
        total=total,
        skip=skip,
        limit=limit,
    )
