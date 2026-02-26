"""Message CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.message import Message


class MessageCRUD:
    """CRUD operations for Message model."""

    async def create(
        self,
        db: AsyncSession,
        *,
        conversation_id: int,
        sender_id: int,
        content: str,
    ) -> Message:
        """Create a new message."""
        message = Message(
            conversation_id=conversation_id,
            sender_id=sender_id,
            content=content,
        )
        db.add(message)
        await db.commit()
        await db.refresh(message)
        return message

    async def get_messages(
        self,
        db: AsyncSession,
        *,
        conversation_id: int,
        before_id: int | None = None,
        limit: int = 50,
    ) -> list[Message]:
        """
        Get messages for a conversation with cursor-based pagination.

        Returns messages in chronological order (oldest first within page).
        Use before_id to load older messages.
        """
        query = select(Message).where(Message.conversation_id == conversation_id)

        if before_id is not None:
            query = query.where(Message.id < before_id)

        # Get newest N messages, then reverse for chronological order
        query = query.order_by(Message.id.desc()).limit(limit)
        result = await db.execute(query)
        messages = list(result.scalars().all())
        messages.reverse()  # Chronological order
        return messages

    async def get_last_message(
        self, db: AsyncSession, *, conversation_id: int
    ) -> Message | None:
        """Get the most recent message in a conversation."""
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.id.desc())
            .limit(1)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def count_messages(
        self, db: AsyncSession, *, conversation_id: int
    ) -> int:
        """Count total messages in a conversation."""
        query = (
            select(func.count())
            .select_from(Message)
            .where(Message.conversation_id == conversation_id)
        )
        result = await db.scalar(query)
        return result or 0


message_crud = MessageCRUD()


def get_message_crud() -> MessageCRUD:
    """Dependency provider for MessageCRUD instance."""
    return message_crud


AnnotatedMessageCRUD = Annotated[MessageCRUD, Depends(get_message_crud)]
