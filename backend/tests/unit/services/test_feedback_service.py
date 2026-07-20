"""Unit tests for FeedbackService.create_feedback guards."""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.models.payment import FulfillmentStatus, PaymentStatus
from app.services.feedback_service import FeedbackService


def _payment(*, buyer_id=1, seller_id=2, status=PaymentStatus.SUCCESSFUL,
             fulfillment=FulfillmentStatus.DELIVERED):
    p = MagicMock()
    p.id = 10
    p.buyer_id = buyer_id
    p.seller_id = seller_id
    p.status = status
    p.fulfillment_status = fulfillment
    return p


def _service(payment, *, exists=False):
    db = AsyncMock()
    payment_crud = MagicMock()
    payment_crud.get_by_id = AsyncMock(return_value=payment)
    feedback_crud = MagicMock()
    feedback_crud.exists_for_payment = AsyncMock(return_value=exists)
    feedback_crud.create = AsyncMock(return_value=MagicMock(id=99))
    return FeedbackService(db, feedback_crud, payment_crud), feedback_crud, db


@pytest.mark.asyncio
async def test_create_feedback_happy_path():
    service, feedback_crud, db = _service(_payment())
    await service.create_feedback(reviewer_id=1, payment_id=10, rating=5, comment="great")
    feedback_crud.create.assert_awaited_once()
    db.commit.assert_awaited_once()


@pytest.mark.asyncio
async def test_missing_payment_404():
    service, _, _ = _service(None)
    with pytest.raises(HTTPException) as exc:
        await service.create_feedback(reviewer_id=1, payment_id=10, rating=5, comment=None)
    assert exc.value.status_code == 404


@pytest.mark.asyncio
async def test_not_buyer_403():
    service, _, _ = _service(_payment(buyer_id=999))
    with pytest.raises(HTTPException) as exc:
        await service.create_feedback(reviewer_id=1, payment_id=10, rating=5, comment=None)
    assert exc.value.status_code == 403


@pytest.mark.asyncio
async def test_not_delivered_400():
    service, _, _ = _service(_payment(fulfillment=FulfillmentStatus.IN_TRANSIT))
    with pytest.raises(HTTPException) as exc:
        await service.create_feedback(reviewer_id=1, payment_id=10, rating=5, comment=None)
    assert exc.value.status_code == 400


@pytest.mark.asyncio
async def test_duplicate_409():
    service, _, _ = _service(_payment(), exists=True)
    with pytest.raises(HTTPException) as exc:
        await service.create_feedback(reviewer_id=1, payment_id=10, rating=5, comment=None)
    assert exc.value.status_code == 409
