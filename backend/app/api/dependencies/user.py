"""User-related API dependencies."""

from typing import Annotated

from fastapi import Depends, Path
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error
from app.crud.user import AnnotatedUserCRUD
from app.db.utils import get_async_db
from app.models import User


async def get_valid_user_by_username(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    user_crud: AnnotatedUserCRUD,
    username: Annotated[str, Path()],
) -> User:
    """
    Dependency to fetch and validate a user exists by username.
    
    Raises:
        HTTPException: 404 if user not found.
    """
    user = await user_crud.get_by_username_with_relations(db, username=username)
    if not user:
        raise not_found_error("User not found")
    return user


AnnotatedValidUserByUsername = Annotated[User, Depends(get_valid_user_by_username)]
