from typing import Annotated, Any, Dict, Optional

import jwt
from fastapi import Depends, Security
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import forbidden_error, not_found_error, unauthorized_error
from app.core.settings import Settings, get_settings
from app.crud.ban import ban_crud
from app.crud.user import user_crud
from app.db.utils import get_async_db
from app.models.user import User
from app.schemas.access_token import AccessTokenSchema

reusable_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")
optional_oauth2 = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login", auto_error=False)

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


async def _resolve_user_from_token(
    db: AsyncSession,
    token: str,
) -> User:
    """
    Decode the token and load the associated user, rejecting invalid tokens and
    deleted or banned accounts.


    Raises:
        HTTPException:
            - unauthorized_error: If the token is invalid, or the account has
              been removed or banned.
            - not_found_error: If the user associated with the token cannot be found.
    """
    try:
        payload = decode_access_token(token)

        if payload is None:
            raise unauthorized_error("Could not validate credentials. (Invalid token)")

        if payload.get("sub") != "access":
            raise unauthorized_error("Could not validate credentials. (Invalid token)")

        token_data = AccessTokenSchema(**payload)
    except jwt.PyJWTError as pyjwt_error:
        raise unauthorized_error("Could not validate credentials.") from pyjwt_error

    if not token_data.user_id:
        raise unauthorized_error("Could not validate credentials. (Invalid token)")

    user = await user_crud.get_by_id_with_relations(db=db, id=token_data.user_id)
    if not user:
        raise not_found_error("User not found")
    if user.is_deleted:
        raise unauthorized_error("Account has been removed")
    active_ban = await ban_crud.get_active_user_ban(db, user_id=user.id)
    if active_ban:
        raise unauthorized_error("Account has been banned")

    return user


async def get_current_user(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    token: str = Security(reusable_oauth2),
) -> User:
    """
    Retrieve the currently authenticated user based on the provided JWT token.

    Requires an active (email-verified) account. Use this for all endpoints
    except those an unverified user must still reach (see
    get_current_user_allow_unverified).

    Args:
        db (AsyncSession): The asynchronous database session dependency.
        token (str): The JWT token provided for authentication.

    Returns:
        User: The authenticated user object.

    Raises:
        HTTPException:
            - unauthorized_error: If the token is invalid, the account is not
              active, or credentials cannot be validated.
            - not_found_error: If the user associated with the token cannot be found.
    """
    user = await _resolve_user_from_token(db, token)

    if not user.is_active:
        raise unauthorized_error("Account is not active")

    return user


async def get_current_user_allow_unverified(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    token: str = Security(reusable_oauth2),
) -> User:
    """
    Like get_current_user, but permits accounts that are pending email
    verification (UserStatus.PENDING).

    Use ONLY for endpoints an unverified user must reach to complete onboarding —
    viewing their own profile (/auth/me) and resending the verification email.
    Every other endpoint must use get_current_user so unverified accounts cannot
    take real actions.

    Args:
        db (AsyncSession): The asynchronous database session dependency.
        token (str): The JWT token provided for authentication.

    Returns:
        User: The authenticated user object, which may be unverified.
    """
    return await _resolve_user_from_token(db, token)


# Type alias for current user dependency
AnnotatedCurrentUser = Annotated[User, Depends(get_current_user)]

AnnotatedCurrentUserAllowUnverified = Annotated[
    User, Depends(get_current_user_allow_unverified)
]


async def get_current_user_optional(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    token: Optional[str] = Depends(optional_oauth2),
) -> Optional[User]:
    """
    Retrieve the currently authenticated user if a valid token is provided.

    Unlike get_current_user, this function does not raise exceptions if
    no token is provided or if the token is invalid. It simply returns None.

    Args:
        db (AsyncSession): The asynchronous database session dependency.
        token (Optional[str]): The JWT token provided for authentication.

    Returns:
        Optional[User]: The authenticated user object, or None if not authenticated.
    """
    if not token:
        return None

    try:
        payload = decode_access_token(token)

        if payload is None:
            return None

        if payload.get("sub") != "access":
            return None

        token_data = AccessTokenSchema(**payload)

        if token_data.user_id:
            user = await user_crud.get_by_id_with_relations(db=db, id=token_data.user_id)
            if not user or user.is_deleted or not user.is_active:
                return None
            active_ban = await ban_crud.get_active_user_ban(db, user_id=user.id)
            if active_ban:
                return None
            return user
    except jwt.PyJWTError:
        return None

    return None


# Type alias for optional current user dependency
AnnotatedCurrentUserOptional = Annotated[Optional[User], Depends(get_current_user_optional)]


async def require_admin_user(
    current_user: AnnotatedCurrentUser,
) -> User:
    """
    Verify that the current user has admin privileges.

    This is a SECURITY-CRITICAL dependency that checks the user's roles
    from the DATABASE (not JWT claims) to ensure admin status cannot be faked.

    Args:
        current_user: The authenticated user from get_current_user.

    Returns:
        User: The admin user.

    Raises:
        HTTPException: 403 Forbidden if user is not an admin.
    """
    if not current_user.is_admin:
        raise forbidden_error("Admin access required")
    return current_user


# Type alias for admin user dependency - USE THIS FOR ALL ADMIN ENDPOINTS
AnnotatedAdminUser = Annotated[User, Depends(require_admin_user)]
