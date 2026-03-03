"""Conversation CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, or_, select, update
from sqlalchemy.dialects.postgresql import insert as pg_insert
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation


class ConversationCRUD:
    """CRUD operations for Conversation model."""

    async def get_or_create(
        self,
        db: AsyncSession,
        *,
        initiator_id: int,
        recipient_id: int,
        post_id: int,
    ) -> Conversation:
        """
        Get existing conversation or create a new one.

        Uses INSERT ... ON CONFLICT DO NOTHING + SELECT to handle
        race conditions atomically.
        """
        stmt = (
            pg_insert(Conversation)
            .values(
                initiator_id=initiator_id,
                recipient_id=recipient_id,
                post_id=post_id,
            )
            .on_conflict_do_nothing(
                constraint="uq_conversation_initiator_recipient_post"
            )
        )
        await db.execute(stmt)
        await db.flush()

        # Always SELECT to get the row (whether just inserted or already existed)
        query = select(Conversation).where(
            Conversation.initiator_id == initiator_id,
            Conversation.recipient_id == recipient_id,
            Conversation.post_id == post_id,
        )
        result = await db.execute(query)
        return result.scalar_one()

    async def get_by_id(
        self, db: AsyncSession, *, conversation_id: int
    ) -> Conversation | None:
        """Get a conversation by ID."""
        query = select(Conversation).where(Conversation.id == conversation_id)
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_by_id_with_relations(
        self, db: AsyncSession, *, conversation_id: int
    ) -> Conversation | None:
        """Get a conversation by ID with initiator, recipient, and post loaded."""
        query = (
            select(Conversation)
            .options(
                selectinload(Conversation.initiator),
                selectinload(Conversation.recipient),
                selectinload(Conversation.post),
            )
            .where(Conversation.id == conversation_id)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def get_user_conversations(
        self, db: AsyncSession, *, user_id: int
    ) -> list[Conversation]:
        """Get all conversations for a user, ordered by last modified."""
        query = (
            select(Conversation)
            .options(
                selectinload(Conversation.initiator),
                selectinload(Conversation.recipient),
                selectinload(Conversation.post),
            )
            .where(
                or_(
                    Conversation.initiator_id == user_id,
                    Conversation.recipient_id == user_id,
                )
            )
            .order_by(Conversation.last_modified_date.desc())
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def is_participant(
        self, db: AsyncSession, *, conversation_id: int, user_id: int
    ) -> bool:
        """Check if a user is a participant in a conversation."""
        query = select(Conversation).where(
            Conversation.id == conversation_id,
            or_(
                Conversation.initiator_id == user_id,
                Conversation.recipient_id == user_id,
            ),
        )
        result = await db.execute(query)
        return result.scalar_one_or_none() is not None

    async def touch(
        self, db: AsyncSession, *, conversation_id: int
    ) -> None:
        """Update last_modified_date to now (for sorting)."""
        stmt = (
            update(Conversation)
            .where(Conversation.id == conversation_id)
            .values(last_modified_date=func.now())
        )
        await db.execute(stmt)


conversation_crud = ConversationCRUD()


def get_conversation_crud() -> ConversationCRUD:
    """Dependency provider for ConversationCRUD instance."""
    return conversation_crud


AnnotatedConversationCRUD = Annotated[ConversationCRUD, Depends(get_conversation_crud)]
