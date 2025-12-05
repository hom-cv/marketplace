"""User CRUD operations."""

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud._base import BaseCRUD
from app.models.user import User
from app.schemas.user import UserCreateSchema, UserUpdateSchema


class UserCRUD(BaseCRUD[User, UserCreateSchema, UserUpdateSchema]):
    """CRUD operations for User model."""

    async def get_by_email(self, db: AsyncSession, *, email: str) -> User | None:
        """
        Retrieve a user by their email address.

        Args:
            db (AsyncSession): The asynchronous database session.
            email (str): The email address to search for.

        Returns:
            User | None: The user if found, or None if not found.
        """
        query = select(self.model).where(self.model.email_address == email)
        result = await db.execute(query)

        return result.scalar_one_or_none()

    async def get_by_username(self, db: AsyncSession, *, username: str) -> User | None:
        """
        Retrieve a user by their username.

        Args:
            db (AsyncSession): The asynchronous database session.
            username (str): The username to search for.

        Returns:
            User | None: The user if found, or None if not found.
        """
        query = select(self.model).where(self.model.username == username)
        result = await db.execute(query)

        return result.scalar_one_or_none()


user_crud = UserCRUD(User)
