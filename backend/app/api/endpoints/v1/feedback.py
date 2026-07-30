"""Feedback API endpoints."""

from typing import Annotated

from fastapi import APIRouter, Depends, status

from app.core.security import get_current_user
from app.models import User
from app.schemas.feedback import FeedbackCreateSchema, FeedbackResponseSchema
from app.services.feedback_service import AnnotatedFeedbackService

router = APIRouter(prefix="/feedback", tags=["feedback"])


@router.post(
    "",
    status_code=status.HTTP_201_CREATED,
    response_model=FeedbackResponseSchema,
)
async def create_feedback(
    feedback_service: AnnotatedFeedbackService,
    data: FeedbackCreateSchema,
    current_user: Annotated[User, Depends(get_current_user)],
) -> FeedbackResponseSchema:
    """
    Leave feedback (rating + optional comment) on a delivered purchase.

    Only the buyer of a delivered order may leave feedback, once per order.
    """
    feedback = await feedback_service.create_feedback(
        reviewer_id=current_user.id,
        payment_id=data.payment_id,
        rating=data.rating,
        comment=data.comment,
    )
    # Build the response from the current user (the reviewer) to avoid an async
    # lazy-load of the relationship after commit.
    return FeedbackResponseSchema(
        id=feedback.id,
        rating=feedback.rating,
        comment=feedback.comment,
        created_at=feedback.created_date,
        reviewer_username=current_user.username,
    )
