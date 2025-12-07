"""Storage service exceptions."""


class StorageError(Exception):
    """Base exception for storage errors."""

    def __init__(self, message: str = "Storage operation failed") -> None:
        self.message = message
        super().__init__(self.message)


class InvalidFileTypeError(StorageError, ValueError):
    """Raised when file type is not allowed."""

    def __init__(self, message: str = "Invalid file type") -> None:
        super().__init__(message)


class TooManyImagesError(StorageError, ValueError):
    """Raised when image limit is exceeded."""

    def __init__(self, message: str = "Too many images") -> None:
        super().__init__(message)


class UploadError(StorageError):
    """Raised when upload to storage fails."""

    def __init__(self, message: str = "Upload failed") -> None:
        super().__init__(message)


class DeleteError(StorageError):
    """Raised when delete from storage fails."""

    def __init__(self, message: str = "Delete failed") -> None:
        super().__init__(message)
