"""User CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.crud._base import BaseCRUD
from app.models.user import User, UserStatus
from app.schemas.user import UserCreateSchema, UserUpdateSchema


class UserCRUD(BaseCRUD[User, UserCreateSchema, UserUpdateSchema]):
    """CRUD operations for User model."""

    async def get_by_id_with_relations(
        self, db: AsyncSession, *, id: int
    ) -> User | None:
        """
        Retrieve a user by ID with roles and seller_profile eagerly loaded.

        This is needed for endpoints that access user.is_seller or
        user.seller_profile to avoid async lazy loading issues.

        Args:
            db (AsyncSession): The asynchronous database session.
            id (int): The user ID.

        Returns:
            User | None: The user if found, or None.
        """
        query = (
            select(self.model)
            .where(self.model.id == id)
            .options(
                selectinload(User.roles),
                selectinload(User.seller_profile),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_email(self, db: AsyncSession, *, email: str) -> User | None:
        """
        Retrieve a user by their email address.

        Args:
            db (AsyncSession): The asynchronous database session.
            email (str): The email address to search for.

        Returns:
            User | None: The user if found, or None if not found.
        """
        query = select(self.model).where(
            func.lower(self.model.email_address) == email.lower()
        )
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

    async def get_by_username_with_relations(
        self, db: AsyncSession, *, username: str
    ) -> User | None:
        """
        Retrieve a user by username with roles and seller_profile loaded.

        Used for public profile viewing.

        Args:
            db (AsyncSession): The asynchronous database session.
            username (str): The username to search for.

        Returns:
            User | None: The user if found, or None if not found.
        """
        query = (
            select(self.model)
            .where(self.model.username == username)
            .where(self.model.deleted_at.is_(None))
            .options(
                selectinload(User.roles),
                selectinload(User.seller_profile),
            )
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def create_user(self, db: AsyncSession, *, user: User) -> User:
        """
        Create a new user in the database.

        Args:
            db (AsyncSession): The asynchronous database session.
            user (User): The user instance to create.

        Returns:
            User: The created user with database-generated fields populated.
        """
        db.add(user)
        await db.commit()
        await db.refresh(user)

        return user

    async def update_email_verified(self, db: AsyncSession, *, user: User) -> User:
        """
        Mark a user's email as verified and set status to ACTIVE.

        Args:
            db (AsyncSession): The asynchronous database session.
            user (User): The user to update.

        Returns:
            User: The updated user.
        """
        user.email_verified = True
        user.status = UserStatus.ACTIVE

        await db.commit()
        await db.refresh(user)

        return user

    async def update_profile(
        self,
        db: AsyncSession,
        *,
        user: User,
        bio: str | None = None,
        show_full_name: bool | None = None,
    ) -> User:
        """
        Update user profile fields.

        Args:
            db (AsyncSession): The asynchronous database session.
            user (User): The user to update.
            bio (str | None): New bio value, or None to skip update.
            show_full_name (bool | None): New visibility setting, or None to skip.

        Returns:
            User: The updated user.
        """
        if bio is not None:
            user.bio = bio
        if show_full_name is not None:
            user.show_full_name = show_full_name

        await db.commit()
        await db.refresh(user)

        return user


user_crud = UserCRUD(User)


def get_user_crud() -> UserCRUD:
    """Dependency provider for UserCRUD instance."""
    return user_crud


AnnotatedUserCRUD = Annotated[UserCRUD, Depends(get_user_crud)]
