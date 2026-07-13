"""Application exceptions.

This module contains all custom exceptions used throughout the application:
- HTTP exception helpers for API responses
- Domain exceptions for business logic errors
- Storage exceptions for file operations
"""

from fastapi import status
from fastapi.exceptions import HTTPException

# =============================================================================
# HTTP Exception Helpers
# =============================================================================


def _build_error(detail: str, status_code: int) -> HTTPException:
    """
    Build an HTTPException with a specific status code and detail message.

    Args:
        detail (str): The detail message describing the error.
        status_code (int): The HTTP status code for the error.
    Returns:
        HTTPException: The constructed HTTPException object with the provided status code and detail.
    """
    return HTTPException(status_code=status_code, detail=detail)


def bad_request_error(detail: str = "Bad request") -> HTTPException:
    """Creates an HTTP 400 Bad Request error."""
    return _build_error(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def unauthorized_error(detail: str = "Unauthorized") -> HTTPException:
    """Creates an HTTP 401 Unauthorized error."""
    return _build_error(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def forbidden_error(detail: str = "Forbidden") -> HTTPException:
    """Creates an HTTP 403 Forbidden error."""
    return _build_error(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def not_found_error(detail: str = "Not found") -> HTTPException:
    """Creates an HTTP 404 Not Found error."""
    return _build_error(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def conflict_error(detail: str = "Conflict") -> HTTPException:
    """Creates an HTTP 409 Conflict error."""
    return _build_error(status_code=status.HTTP_409_CONFLICT, detail=detail)


def too_many_requests_error(detail: str = "Too many requests") -> HTTPException:
    """Creates an HTTP 429 Too Many Requests error."""
    return _build_error(status_code=status.HTTP_429_TOO_MANY_REQUESTS, detail=detail)


def server_error(detail: str = "Internal server error") -> HTTPException:
    """Creates an HTTP 500 Internal Server Error."""
    return _build_error(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )


# =============================================================================
# Domain Error Helpers
# =============================================================================


def domain_error(detail: str = "A domain error occurred") -> HTTPException:
    """Creates a generic domain error (HTTP 400)."""
    return _build_error(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def invalid_carrier_error(carrier: str) -> HTTPException:
    """Creates an error for invalid shipping carrier (HTTP 400)."""
    return _build_error(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail=f"Invalid shipping carrier: {carrier}",
    )


def payment_not_found_error(payment_id: int | str | None = None) -> HTTPException:
    """Creates an error for payment not found (HTTP 404)."""
    detail = f"Payment not found: {payment_id}" if payment_id else "Payment not found"
    return _build_error(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def post_not_found_error(post_id: int | str | None = None) -> HTTPException:
    """Creates an error for post not found (HTTP 404)."""
    detail = f"Post not found: {post_id}" if post_id else "Post not found"
    return _build_error(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def seller_not_verified_error(detail: str = "Seller is not verified") -> HTTPException:
    """Creates an error for unverified seller (HTTP 403)."""
    return _build_error(status_code=status.HTTP_403_FORBIDDEN, detail=detail)


def cannot_purchase_own_listing_error() -> HTTPException:
    """Creates an error for attempting to purchase own listing (HTTP 400)."""
    return _build_error(
        status_code=status.HTTP_400_BAD_REQUEST,
        detail="You cannot purchase your own listing",
    )


# =============================================================================
# Storage Error Helpers
# =============================================================================


def storage_error(detail: str = "Storage operation failed") -> HTTPException:
    """Creates a generic storage error (HTTP 500)."""
    return _build_error(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )


def invalid_file_type_error(detail: str = "Invalid file type") -> HTTPException:
    """Creates an error for invalid file type (HTTP 400)."""
    return _build_error(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def too_many_images_error(detail: str = "Too many images") -> HTTPException:
    """Creates an error for exceeding image limit (HTTP 400)."""
    return _build_error(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


def upload_error(detail: str = "Upload failed") -> HTTPException:
    """Creates an error for upload failure (HTTP 500)."""
    return _build_error(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )


def delete_error(detail: str = "Delete failed") -> HTTPException:
    """Creates an error for delete failure (HTTP 500)."""
    return _build_error(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail
    )
