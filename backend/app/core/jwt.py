from datetime import UTC, datetime, timedelta

import jwt

from app.constants.message import WS_TICKET_EXPIRES_SECONDS
from app.core.settings import Settings, get_settings

settings: Settings = get_settings()

ALGORITHM = "HS256"


def create_access_token(*, data: dict, expires_delta: timedelta | None = None) -> str:
    """
    Create an access token with the given data and optional expiration time.

    Args:
        data (dict): The data to encode in the token payload.
        expires_delta (timedelta | None, optional): The duration after which the token expires. If None, the token will expire in 15 minutes. Defaults to None.

    Returns:
        str: The encoded JWT access token.

    Raises:
        Exception: If there is an error encoding the JWT.
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(UTC) + expires_delta
    else:
        expire = datetime.now(UTC) + timedelta(minutes=15)

    to_encode.update(
        {
            "exp": expire,
            "sub": "access",
        }
    )
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)

    return encoded_jwt


def create_email_verification_token(user_id: int) -> str:
    """
    Create a token for email verification.

    Args:
        user_id (int): The ID of the user to verify.

    Returns:
        str: The encoded JWT verification token.
    """
    expire = datetime.now(UTC) + timedelta(hours=24)
    to_encode = {
        "user_id": user_id,
        "exp": expire,
        "sub": "email_verification",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def create_ws_ticket(user_id: int) -> str:
    """Create a short-lived ticket for WebSocket authentication."""
    expire = datetime.now(UTC) + timedelta(seconds=WS_TICKET_EXPIRES_SECONDS)
    to_encode = {
        "user_id": user_id,
        "exp": expire,
        "sub": "ws_ticket",
    }
    return jwt.encode(to_encode, settings.JWT_SECRET_KEY, algorithm=ALGORITHM)


def verify_email_token(token: str) -> int | None:
    """
    Verify an email verification token and extract the user ID.

    Args:
        token (str): The JWT verification token.

    Returns:
        int | None: The user ID if valid, None if invalid or expired.
    """
    try:
        payload = jwt.decode(token, settings.JWT_SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("sub") != "email_verification":
            return None

        user_id = payload.get("user_id")

        if not isinstance(user_id, int):
            return None

        return user_id
    except jwt.PyJWTError:
        return None
