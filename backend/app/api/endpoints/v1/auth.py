from datetime import timedelta
from typing import Annotated

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
from app.schemas.user import UserResponseSchema
from app.services.auth import AuthService
from fastapi import APIRouter, Depends, Response, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.ext.asyncio import AsyncSession

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
    """
    user = await AuthService(db=db).register_user(obj_in)

    return AuthRegisterResponse.model_validate(user)


@router.post("/login", status_code=status.HTTP_200_OK)
async def login_user(
    db: Annotated[AsyncSession, Depends(get_async_db)],
    response: Response,
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

    response.set_cookie(
        key="access_token",
        value=access_token,
        httponly=False,
        secure=True,
        samesite=None,
        expires=60 * 60 * 24,
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
    return UserResponseSchema.model_validate(current_user)
