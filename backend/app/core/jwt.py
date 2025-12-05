from datetime import UTC, datetime, timedelta

import jwt

from app.core.settings import Settings, get_settings

settings: Settings = get_settings()


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
    encoded_jwt = jwt.encode(to_encode, settings.JWT_SECRET_KEY)

    return encoded_jwt
