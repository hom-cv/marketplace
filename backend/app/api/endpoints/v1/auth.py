"""Authentication API endpoints."""

from datetime import timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Query, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.jwt import create_access_token
from app.core.security import get_current_user
from app.db.utils import get_async_db
from app.models import User
from app.schemas.auth import (
    AuthLoginResponse,
    AuthLoginSchema,
    AuthRegisterResponse,
    AuthRegisterSchema,
)
from app.schemas.email_verification import EmailVerificationResponse
from app.schemas.user import UserResponseSchema
from app.services.auth import AuthService

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=AuthRegisterResponse,
)
async def register_user(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    obj_in: AuthRegisterSchema,
) -> AuthRegisterResponse:
    """
    Register a new user account.

    - **username**: Unique username (alphanumeric and underscores only, 3-64 chars)
    - **first_name**: User's first name (1-64 chars)
    - **last_name**: User's last name (1-64 chars)
    - **email_address**: Unique email address
    - **password**: Password (minimum 8 characters)

    Returns the created user (without password).
    A verification email will be sent to the provided email address.
    """
    user = await AuthService(db=db).register_user(obj_in)

    return AuthRegisterResponse.model_validate(user)


@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    form_data: Annotated[OAuth2PasswordRequestForm, Depends()],
):
    """
    Authenticate a user and return an access token.

    Use the email address as the username field.
    """
    obj_in = AuthLoginSchema(
        email_address=form_data.username, password=form_data.password
    )
    user = await AuthService(db=db).login_user(obj_in)

    expires_delta = timedelta(days=1)
    access_token = create_access_token(
        data={"user_id": user.id}, expires_delta=expires_delta
    )

    return AuthLoginResponse(
        access_token=access_token,
        token_type="bearer",
    )


@router.get("/me", status_code=status.HTTP_200_OK, response_model=UserResponseSchema)
async def get_user(current_user: Annotated[User, Depends(get_current_user)]):
    """
    Get the currently authenticated user's information.
    """
    return UserResponseSchema.from_user(current_user)


@router.get(
    "/verify-email",
    status_code=status.HTTP_200_OK,
    response_model=EmailVerificationResponse,
)
async def verify_email(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    token: Annotated[str, Query(description="Email verification token")],
) -> EmailVerificationResponse:
    """
    Verify a user's email address using the verification token.

    The token is sent to the user's email during registration.
    """
    await AuthService(db=db).verify_email(token)

    return EmailVerificationResponse(message="Email verified successfully")


@router.post(
    "/resend-verification",
    status_code=status.HTTP_200_OK,
    response_model=EmailVerificationResponse,
)
async def resend_verification_email(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> EmailVerificationResponse:
    """
    Resend the verification email to the currently authenticated user.

    Requires authentication.
    """
    await AuthService(db=db).resend_verification_email(current_user)

    return EmailVerificationResponse(message="Verification email sent successfully")
