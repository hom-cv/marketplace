"""CRUD operations for message flags."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.constants.message_flag import MessageFlagStatus
from app.models.message_flag import MessageFlag


class MessageFlagCRUD:
    """CRUD operations for message flags."""

    async def create(
        self,
        db: AsyncSession,
        *,
        message_id: int,
        conversation_id: int,
        sender_id: int,
        matched_patterns: str,
    ) -> MessageFlag:
        """Create a new message flag."""
        flag = MessageFlag(
            message_id=message_id,
            conversation_id=conversation_id,
            sender_id=sender_id,
            matched_patterns=matched_patterns,
            status=MessageFlagStatus.PENDING,
        )
        db.add(flag)
        await db.flush()
        return flag

    async def get_all(
        self,
        db: AsyncSession,
        *,
        status: MessageFlagStatus | None = None,
        skip: int = 0,
        limit: int = 50,
    ) -> tuple[list[MessageFlag], int]:
        """Get all message flags with optional status filter."""
        base_query = select(MessageFlag)
        if status:
            base_query = base_query.where(MessageFlag.status == status)

        count_query = select(func.count()).select_from(base_query.subquery())
        data_query = (
            base_query
            .options(
                selectinload(MessageFlag.message),
                selectinload(MessageFlag.sender),
                selectinload(MessageFlag.reviewed_by),
            )
            .order_by(MessageFlag.created_date.desc())
            .offset(skip)
            .limit(limit)
        )

        result = await db.execute(data_query)
        total = await db.scalar(count_query)

        return result.scalars().all(), total or 0

    async def get_by_id(
        self,
        db: AsyncSession,
        *,
        flag_id: int,
    ) -> MessageFlag | None:
        """Get a message flag by ID."""
        query = (
            select(MessageFlag)
            .options(
                selectinload(MessageFlag.message),
                selectinload(MessageFlag.sender),
                selectinload(MessageFlag.reviewed_by),
            )
            .where(MessageFlag.id == flag_id)
        )
        result = await db.execute(query)
        return result.scalar_one_or_none()

    async def dismiss(
        self,
        db: AsyncSession,
        *,
        flag: MessageFlag,
        reviewed_by_user_id: int,
    ) -> MessageFlag:
        """Dismiss a message flag."""
        flag.status = MessageFlagStatus.DISMISSED
        flag.reviewed_by_user_id = reviewed_by_user_id
        flag.reviewed_at = datetime.now(timezone.utc)

        db.add(flag)
        await db.commit()
        await db.refresh(flag)
        return flag

    async def get_pending_count(self, db: AsyncSession) -> int:
        """Get count of pending message flags."""
        query = select(func.count(MessageFlag.id)).where(
            MessageFlag.status == MessageFlagStatus.PENDING
        )
        return await db.scalar(query) or 0


message_flag_crud = MessageFlagCRUD()


def get_message_flag_crud() -> MessageFlagCRUD:
    """Dependency provider for MessageFlagCRUD instance."""
    return message_flag_crud


AnnotatedMessageFlagCRUD = Annotated[MessageFlagCRUD, Depends(get_message_flag_crud)]
