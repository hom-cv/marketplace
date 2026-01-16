"""Post-related API dependencies."""

from typing import Annotated

from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error
from app.crud.post import PostCRUD, get_post_crud, AnnotatedPostCRUD
from app.db.utils import get_async_db
from app.models import Post


async def get_valid_post(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    post_crud_dep: AnnotatedPostCRUD,
    post_id: Annotated[int, Path()],
) -> Post:
    """
    Dependency to fetch and validate a post exists.
    
    Raises:
        HTTPException: 404 if post not found or deleted.
    """
    post = await post_crud_dep.get_by_id(db, id=post_id)
    if not post or post.deleted_at:
        raise not_found_error("Post not found")
    return post


AnnotatedValidPost = Annotated[Post, Depends(get_valid_post)]
