"""Auth service layer for authentication operations."""

import logging
from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    bad_request_error,
    conflict_error,
    not_found_error,
    unauthorized_error,
)
from app.core.jwt import verify_email_token
from app.core.password import get_password_hash, verify_password
from app.crud.user import user_crud
from app.models.user import User
from app.schemas.auth import AuthLoginSchema, AuthRegisterSchema
from app.services.email_service import get_email_service

logger = logging.getLogger(__name__)


class AuthService:
    """Service class for authentication-related operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize the AuthService with a database session.

        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db
        self._email_service = get_email_service()

    async def register_user(self, obj_in: AuthRegisterSchema) -> User:
        """
        Register a new user account.

        Args:
            obj_in (AuthRegisterSchema): The registration data containing user details.

        Returns:
            User: The newly created user.

        Raises:
            HTTPException: If email or username already exists (409 Conflict).
        """
        # Check if email already exists
        existing_email = await user_crud.get_by_email(
            db=self.db, email=obj_in.email_address
        )
        if existing_email:
            raise conflict_error("A user with this email address already exists")

        # Check if username already exists
        existing_username = await user_crud.get_by_username(
            db=self.db, username=obj_in.username
        )
        if existing_username:
            raise conflict_error("A user with this username already exists")

        # Create the user instance
        user = User(
            username=obj_in.username,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            email_address=obj_in.email_address,
            hashed_password=get_password_hash(obj_in.password),
        )

        # Persist to database via CRUD layer
        user = await user_crud.create_user(db=self.db, user=user)

        # Send verification email
        email_sent = self._email_service.send_verification_email(
            user_id=user.id,
            email=user.email_address,
            first_name=user.first_name,
        )
        if not email_sent:
            logger.warning(
                "Failed to send verification email to user %s (%s)",
                user.id,
                user.email_address,
            )

        return user

    async def login_user(self, obj_in: AuthLoginSchema) -> User:
        """
        Authenticate a user with email and password.

        Args:
            obj_in (AuthLoginSchema): The login credentials.

        Returns:
            User: The authenticated user.

        Raises:
            HTTPException: If credentials are invalid (401 Unauthorized).
        """
        user = await user_crud.get_by_email(db=self.db, email=obj_in.email_address)

        if not user:
            raise unauthorized_error("Invalid email or password")

        if not verify_password(obj_in.password, user.hashed_password):
            raise unauthorized_error("Invalid email or password")

        return user

    async def verify_email(self, token: str) -> User:
        """
        Verify a user's email address using the verification token.

        Args:
            token (str): The email verification token.

        Returns:
            User: The verified user.

        Raises:
            HTTPException: If token is invalid or expired (400 Bad Request).
        """
        user_id = verify_email_token(token)
        if user_id is None:
            raise bad_request_error("Invalid or expired verification token")

        user = await user_crud.get_by_id(db=self.db, id=user_id)
        if not user:
            raise not_found_error("User not found")

        if user.email_verified:
            raise bad_request_error("Email already verified")

        # Update via CRUD layer
        user = await user_crud.update_email_verified(db=self.db, user=user)

        return user

    async def resend_verification_email(self, user: User):
        """
        Resend verification email to the user.

        Args:
            user (User): The user to resend verification email to.

        Raises:
            HTTPException: If email is already verified (400 Bad Request).
        """
        if user.email_verified:
            raise bad_request_error("Email already verified")

        email_sent = self._email_service.send_verification_email(
            user_id=user.id,
            email=user.email_address,
            first_name=user.first_name,
        )
        if not email_sent:
            logger.error(
                "Failed to resend verification email to user %s (%s)",
                user.id,
                user.email_address,
            )
            raise bad_request_error(
                "Failed to send verification email. Please try again later."
            )


def get_auth_service(db: AsyncSession) -> AuthService:
    """Factory function to create AuthService instance."""
    return AuthService(db)


AnnotatedAuthService = Annotated[AuthService, Depends(get_auth_service)]
