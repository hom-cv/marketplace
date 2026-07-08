"""Tag CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.utils import normalize_tag
from app.models.tag import Tag


class TagCRUD:
    """CRUD operations for Tag model."""

    async def get_or_create_many(
        self, db: AsyncSession, *, names: list[str]
    ) -> list[Tag]:
        """Normalize + dedupe ``names``, create any missing tags, return all rows.

        One bulk INSERT ... ON CONFLICT DO NOTHING on the unique name, then a
        single SELECT to fetch the full set (existing + newly created).
        """
        normalized: list[str] = []
        seen: set[str] = set()
        for raw in names:
            n = normalize_tag(raw)
            if n and n not in seen:
                seen.add(n)
                normalized.append(n)
        if not normalized:
            return []
        await db.execute(
            pg_insert(Tag)
            .values([{"name": n} for n in normalized])
            .on_conflict_do_nothing(index_elements=["name"])
        )
        result = await db.scalars(select(Tag).where(Tag.name.in_(normalized)))
        return list(result.all())


tag_crud = TagCRUD()


def get_tag_crud() -> TagCRUD:
    """Dependency provider for TagCRUD instance."""
    return tag_crud


AnnotatedTagCRUD = Annotated[TagCRUD, Depends(get_tag_crud)]
