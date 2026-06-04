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
from app.crud.user import UserCRUD, get_user_crud
from app.db.utils import get_async_db
from app.models.user import User
from app.schemas.auth import AuthLoginSchema, AuthRegisterSchema
from app.services.email_service import AnnotatedEmailService, EmailService

logger = logging.getLogger(__name__)


AnnotatedUserCRUD = Annotated[UserCRUD, Depends(get_user_crud)]


class AuthService:
    """Service class for authentication-related operations."""

    def __init__(
        self, db: AsyncSession, email_service: EmailService, user_crud_dep: UserCRUD
    ):
        """
        Initialize the AuthService with a database session.

        Args:
            db (AsyncSession): The asynchronous database session.
            email_service (EmailService): Email service for sending emails.
            user_crud_dep (UserCRUD): User CRUD operations.
        """
        self.db = db
        self._email_service = email_service
        self._user_crud = user_crud_dep

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
        # Normalize email and username to lowercase for consistent storage
        normalized_email = obj_in.email_address.lower()
        normalized_username = obj_in.username.lower()

        # Check if email already exists
        existing_email = await self._user_crud.get_by_email(
            db=self.db, email=normalized_email
        )
        if existing_email:
            raise conflict_error("A user with this email address already exists")

        # Check if username already exists (case-insensitive)
        existing_username = await self._user_crud.get_by_username(
            db=self.db, username=normalized_username
        )
        if existing_username:
            raise conflict_error("A user with this username already exists")

        # Create the user instance
        user = User(
            username=normalized_username,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            email_address=normalized_email,
            hashed_password=get_password_hash(obj_in.password),
        )

        # Persist to database via CRUD layer
        user = await self._user_crud.create_user(db=self.db, user=user)

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
        user = await self._user_crud.get_by_email(db=self.db, email=obj_in.email_address)

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

        user = await self._user_crud.get_by_id(db=self.db, id=user_id)
        if not user:
            raise not_found_error("User not found")

        if user.email_verified:
            raise bad_request_error("Email already verified")

        # Update via CRUD layer
        user = await self._user_crud.update_email_verified(db=self.db, user=user)

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


def _get_auth_service(
    email_service: AnnotatedEmailService,
    user_crud_dep: AnnotatedUserCRUD,
    db: AsyncSession = Depends(get_async_db),
) -> AuthService:
    """Factory function to create AuthService instance."""
    return AuthService(db, email_service, user_crud_dep)


AnnotatedAuthService = Annotated[AuthService, Depends(_get_auth_service)]
