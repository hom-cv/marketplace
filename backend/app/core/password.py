"""Password hashing utilities using bcrypt."""

import bcrypt


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verify a plain password against a hashed password.

    Args:
        plain_password (str): The plain text password to verify.
        hashed_password (str): The hashed password to compare against.

    Returns:
        bool: True if the password matches, False otherwise.
    """
    password_byte_enc = plain_password.encode("utf-8")
    hashed_password_bytes = hashed_password.encode("utf-8")

    return bcrypt.checkpw(
        password=password_byte_enc, hashed_password=hashed_password_bytes
    )


def get_password_hash(password: str) -> str:
    """
    Generate a bcrypt hash for the given password.

    Args:
        password (str): The plain text password to hash.

    Returns:
        str: The bcrypt hashed password.
    """
    pwd_bytes = password.encode("utf-8")
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password=pwd_bytes, salt=salt)

    return hashed_password.decode("utf-8")
