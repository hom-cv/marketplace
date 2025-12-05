"""Auth service layer for authentication operations."""

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import conflict_error, unauthorized_error
from app.core.password import get_password_hash, verify_password
from app.crud.user import user_crud
from app.models.user import User
from app.schemas.auth import AuthLoginSchema, AuthRegisterSchema


class AuthService:
    """Service class for authentication-related operations."""

    def __init__(self, db: AsyncSession):
        """
        Initialize the AuthService with a database session.

        Args:
            db (AsyncSession): The asynchronous database session.
        """
        self.db = db

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

        # Hash the password
        hashed_password = get_password_hash(obj_in.password)

        # Create the user
        user = User(
            username=obj_in.username,
            first_name=obj_in.first_name,
            last_name=obj_in.last_name,
            email_address=obj_in.email_address,
            hashed_password=hashed_password,
        )

        self.db.add(user)
        await self.db.commit()
        await self.db.refresh(user)

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
