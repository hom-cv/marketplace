"""Seller API endpoints for registration and verification."""

from typing import Annotated

from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_current_user
from app.db.utils import get_async_db
from app.models import User
from app.schemas.seller import (
    SellerStatusResponse,
    SellerVerificationRequest,
    SellerVerificationResponse,
)
from app.services.seller_service import SellerService, get_seller_service

router = APIRouter(prefix="/seller", tags=["seller"])


@router.post(
    "/register",
    status_code=status.HTTP_201_CREATED,
    response_model=SellerVerificationResponse,
)
async def register_seller(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: Annotated[SellerService, Depends(get_seller_service)],
    verification_request: SellerVerificationRequest,
) -> SellerVerificationResponse:
    """
    Register as a seller by providing bank account details.

    This initiates the seller verification process with Omise.
    You must have a verified email to become a seller.

    - **bank_brand**: Bank code (e.g., 'kbank', 'bbl', 'scb', 'ktb')
    - **bank_account_number**: Your bank account number
    - **bank_account_name**: Name on the bank account

    Available bank brands:
    - 'bbl' - Bangkok Bank
    - 'kbank' - Kasikorn Bank
    - 'ktb' - Krung Thai Bank
    - 'scb' - Siam Commercial Bank
    - 'bay' - Bank of Ayudhya (Krungsri)
    - 'gsb' - Government Savings Bank
    - 'cimb' - CIMB Thai
    - 'tbank' - Thanachart Bank
    - 'uob' - United Overseas Bank
    """
    return await seller_service.register_seller(
        user=current_user,
        verification_request=verification_request,
    )


@router.get(
    "/status",
    status_code=status.HTTP_200_OK,
    response_model=SellerStatusResponse,
)
async def get_seller_status(
    current_user: Annotated[User, Depends(get_current_user)],
    seller_service: Annotated[SellerService, Depends(get_seller_service)],
) -> SellerStatusResponse:
    """
    Get the current seller status for the authenticated user.

    Returns verification status, bank details (if any), and verification timestamp.
    """
    return await seller_service.get_seller_status(user=current_user)
