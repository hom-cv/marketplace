"""Feedback service for review business logic."""

from typing import Annotated

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import (
    bad_request_error,
    conflict_error,
    forbidden_error,
    payment_not_found_error,
)
from app.crud.feedback import FeedbackCRUD, get_feedback_crud
from app.crud.payment import PaymentCRUD, get_payment_crud
from app.db.utils import get_async_db
from app.models.feedback import Feedback
from app.models.payment import FulfillmentStatus, PaymentStatus


class FeedbackService:
    """Service for leaving feedback on purchases."""

    def __init__(
        self,
        db: AsyncSession,
        feedback_crud: FeedbackCRUD,
        payment_crud: PaymentCRUD,
    ) -> None:
        self.db = db
        self._feedback_crud = feedback_crud
        self._payment_crud = payment_crud

    async def create_feedback(
        self,
        *,
        reviewer_id: int,
        payment_id: int,
        rating: int,
        comment: str | None,
    ) -> Feedback:
        """
        Leave feedback on a delivered purchase.

        Raises:
            404 if the payment does not exist.
            403 if the reviewer is not the buyer.
            400 if the order is not a delivered, successful purchase.
            409 if feedback already exists for this payment.
        """
        payment = await self._payment_crud.get_by_id(self.db, id=payment_id)
        if not payment:
            raise payment_not_found_error(payment_id)
        if payment.buyer_id != reviewer_id:
            raise forbidden_error(
                "You can only leave feedback on your own purchases"
            )
        if (
            payment.status != PaymentStatus.SUCCESSFUL
            or payment.fulfillment_status != FulfillmentStatus.DELIVERED
        ):
            raise bad_request_error(
                "You can only leave feedback on delivered orders"
            )
        if await self._feedback_crud.exists_for_payment(
            self.db, payment_id=payment_id
        ):
            raise conflict_error(
                "You have already left feedback for this order"
            )

        feedback = await self._feedback_crud.create(
            self.db,
            payment_id=payment_id,
            reviewer_user_id=reviewer_id,
            seller_user_id=payment.seller_id,
            rating=rating,
            comment=comment,
        )
        await self.db.commit()
        return feedback


def _get_feedback_service(
    feedback_crud: Annotated[FeedbackCRUD, Depends(get_feedback_crud)],
    payment_crud: Annotated[PaymentCRUD, Depends(get_payment_crud)],
    db: AsyncSession = Depends(get_async_db),
) -> FeedbackService:
    """Factory function to create FeedbackService instance."""
    return FeedbackService(db, feedback_crud, payment_crud)


AnnotatedFeedbackService = Annotated[
    FeedbackService, Depends(_get_feedback_service)
]
