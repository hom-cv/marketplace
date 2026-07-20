"""Feedback CRUD operations."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.feedback import Feedback


class FeedbackCRUD:
    """CRUD operations for Feedback model."""

    async def create(
        self,
        db: AsyncSession,
        *,
        payment_id: int,
        reviewer_user_id: int,
        seller_user_id: int,
        rating: int,
        comment: str | None,
    ) -> Feedback:
        """Create a feedback row (caller commits)."""
        feedback = Feedback(
            payment_id=payment_id,
            reviewer_user_id=reviewer_user_id,
            seller_user_id=seller_user_id,
            rating=rating,
            comment=comment,
        )
        db.add(feedback)
        await db.flush()
        return feedback

    async def exists_for_payment(
        self, db: AsyncSession, *, payment_id: int
    ) -> bool:
        """Whether feedback already exists for a payment."""
        query = select(
            select(Feedback.id).where(Feedback.payment_id == payment_id).exists()
        )
        return bool(await db.scalar(query))

    async def get_for_seller(
        self, db: AsyncSession, *, seller_id: int, skip: int = 0, limit: int = 50
    ) -> list[Feedback]:
        """List feedback received by a seller, newest first (reviewer eager-loaded)."""
        query = (
            select(Feedback)
            .where(Feedback.seller_user_id == seller_id)
            .order_by(Feedback.created_date.desc())
            .offset(skip)
            .limit(limit)
        )
        result = await db.execute(query)
        return list(result.scalars().all())

    async def get_rating_summary(
        self, db: AsyncSession, *, seller_id: int
    ) -> tuple[float | None, int]:
        """Return (average_rating, count) for a seller. Average is None if no feedback."""
        query = select(func.avg(Feedback.rating), func.count(Feedback.id)).where(
            Feedback.seller_user_id == seller_id
        )
        avg, count = (await db.execute(query)).one()
        return (float(avg) if avg is not None else None, count or 0)

    async def get_reviewed_payment_ids(
        self, db: AsyncSession, *, reviewer_user_id: int, payment_ids: list[int]
    ) -> set[int]:
        """Subset of the given payment ids the reviewer has already reviewed."""
        if not payment_ids:
            return set()
        query = select(Feedback.payment_id).where(
            Feedback.reviewer_user_id == reviewer_user_id,
            Feedback.payment_id.in_(payment_ids),
        )
        result = await db.execute(query)
        return set(result.scalars().all())


feedback_crud = FeedbackCRUD()


def get_feedback_crud() -> FeedbackCRUD:
    """Dependency provider for FeedbackCRUD instance."""
    return feedback_crud


AnnotatedFeedbackCRUD = Annotated[FeedbackCRUD, Depends(get_feedback_crud)]
