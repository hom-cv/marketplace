from typing import Generic, Sequence, Type, TypeVar

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import not_found_error
from app.models import Base

ModelType = TypeVar("ModelType", bound=Base)  # type: ignore
CreateSchemaType = TypeVar("CreateSchemaType", bound=Base)  # type: ignore
UpdateSchemaType = TypeVar("UpdateSchemaType", bound=Base)  # type: ignore


class BaseCRUD(Generic[ModelType, CreateSchemaType, UpdateSchemaType]):
    """
    Generic CRUD base.

    Transaction convention: CRUD methods flush (never commit); the service
    layer owns the commit so multi-step flows stay atomic.
    """

    def __init__(self, model: Type[ModelType]) -> None:
        """
        Initialize a generic Base CRUD class for interacting with the database.

        Args:
            model (Type[ModelType]): The SQLAlchemy model class to perform CRUD operations on.
        """
        self.model = model

    async def exists(self, db: AsyncSession, id: int) -> bool:
        """
        Check if an instance of the model with the given ID exists in the database.

        Args:
            db (AsyncSession): The asynchronous database session dependency.
            id (int): The ID of the resource to check.

        Returns:
            bool: True if a resource with the given ID exists, False otherwise.
        """
        query = select(
            select(self.model.id).where(self.model.id == id).exists()
        )
        result = await db.scalar(query)

        return bool(result)

    async def get_by_id(self, db: AsyncSession, id: int) -> ModelType | None:
        """
        Retrieve an instance of the model by its ID.

        Args:
            db (AsyncSession): The asynchronous database session dependency.
            id (int): The ID of the resource to retrieve.

        Returns:
            ModelType | None: The instance of the model if found, or None if not found.
        """
        query = select(self.model).where(self.model.id == id)
        result = await db.execute(query)

        return result.scalar_one_or_none()

    async def get(self, db: AsyncSession) -> Sequence[ModelType]:
        """
        Retrieve all instances of the model from the database.

        Args:
            db (AsyncSession): The asynchronous database session dependency.

        Returns:
            Sequence[ModelType]: A sequence of all instances of the model.
        """
        query = select(self.model).order_by(self.model.id.asc())
        result = await db.scalars(query)

        return result.all()

    async def create(self, db: AsyncSession, *, obj_in: CreateSchemaType) -> ModelType:
        """
        Create a new instance of the model in the database.

        Args:
            db (AsyncSession): The asynchronous database session dependency.
            obj_in (CreateSchemaType): The schema containing the data for the new instance.

        Returns:
            ModelType: The created instance of the model.
        """
        obj_in_dict = obj_in.model_dump()
        created_obj = self.model(**obj_in_dict)

        db.add(created_obj)
        await db.flush()
        await db.refresh(created_obj)

        return created_obj

    async def update(
        self, db: AsyncSession, *, db_obj: ModelType, obj_in: UpdateSchemaType
    ) -> ModelType:
        """
        Update an existing instance of the model in the database.

        Args:
            db (AsyncSession): The asynchronous database session dependency.
            db_obj (ModelType): The existing instance of the model to be updated.
            obj_in (UpdateSchemaType): The schema containing the update data.

        Returns:
            ModelType: The updated instance of the model.
        """
        update_data = obj_in.model_dump(exclude_unset=True)
        for field in update_data:
            setattr(db_obj, field, update_data[field])

        db.add(db_obj)
        await db.flush()
        await db.refresh(db_obj)

        return db_obj

    async def delete(self, db: AsyncSession, *, id: int) -> None:
        """
        Delete an instance of the model by its ID.

        Args:
            db (AsyncSession): The asynchronous database session dependency.
            id (int): The ID of the resource to be deleted.
        """
        obj = await self.get_by_id(db=db, id=id)

        if obj:
            await db.delete(obj)
            await db.flush()
        else:
            raise not_found_error("Resource not found")
