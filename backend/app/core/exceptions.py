from fastapi import status
from fastapi.exceptions import HTTPException


def _build_error(detail: str, status_code: int) -> HTTPException:
    """
    Helper function to build an HTTPException with a specific status code and detail message.

    Args:
        detail (str): The detail message describing the error.
        status_code (int): The HTTP status code for the error.

    Returns:
        HTTPException: The constructed HTTPException object with the provided status code and detail.
    """
    return HTTPException(
        status_code=status_code,
        detail=detail,
    )


def not_found_error(detail: str = "Not found") -> HTTPException:
    """
    Creates an HTTP 404 Not Found error.

    Args:
        detail (str, optional): The detail message for the error. Defaults to "Not found".

    Returns:
        HTTPException: The constructed HTTP 404 Not Found exception.
    """
    return _build_error(status_code=status.HTTP_404_NOT_FOUND, detail=detail)


def unauthorized_error(detail: str = "Unauthorized") -> HTTPException:
    """
    Creates an HTTP 401 Unauthorized error.

    Args:
        detail (str, optional): The detail message for the error. Defaults to "Unauthorized".

    Returns:
        HTTPException: The constructed HTTP 401 Unauthorized exception.
    """
    return _build_error(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def conflict_error(detail: str = "Conflict") -> HTTPException:
    """
    Creates an HTTP 409 Conflict error.

    Args:
        detail (str, optional): The detail message for the error. Defaults to "Conflict".

    Returns:
        HTTPException: The constructed HTTP 409 Conflict exception.
    """
    return _build_error(status_code=status.HTTP_409_CONFLICT, detail=detail)


def bad_request_error(detail: str = "Bad request") -> HTTPException:
    """
    Creates an HTTP 400 Bad Request error.

    Args:
        detail (str, optional): The detail message for the error. Defaults to "Bad request".

    Returns:
        HTTPException: The constructed HTTP 400 Bad Request exception.
    """
    return _build_error(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)

