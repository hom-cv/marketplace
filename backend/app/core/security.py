from typing import Annotated, Any, Dict, Optional

import jwt
from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error, unauthorized_error
from app.core.settings import Settings, get_settings
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.user import User
from app.schemas.access_token import AccessTokenSchema

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

settings: Settings = get_settings()


def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
    """
    Decode the JWT token without raising exceptions.

    Args:
        token (str): The JWT token to decode

    Returns:
        Optional[Dict[str, Any]]: The decoded payload or None if invalid
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=["HS256"])

        return payload
    except jwt.PyJWTError:
        return None


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    token: str = Security(reusable_oauth2),
) -> User:
    """
    Retrieve the currently authenticated user based on the provided JWT token.

    Args:
        db (AsyncSession): The asynchronous database session dependency.
        token (str): The JWT token provided for authentication.

    Returns:
        User: The authenticated user object.

    Raises:
        HTTPException:
            - unauthorized_error: If the token is invalid or credentials cannot be validated.
            - not_found_error: If the user associated with the token cannot be found.
    """
    try:
        payload = decode_access_token(token)

        if payload is None:
            raise unauthorized_error("Could not validate credentials. (Invalid token)")

        token_data = AccessTokenSchema(**payload)
    except jwt.PyJWTError as pyjwt_error:
        raise unauthorized_error("Could not validate credentials.") from pyjwt_error

    if token_data.user_id:
        user = await user_crud.get_by_id_with_relations(db=db, id=token_data.user_id)
        if not user:
            raise not_found_error("User not found")
    else:
        raise unauthorized_error("Could not validate credentials. (Invalid token)")

    return user
