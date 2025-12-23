"""Storage service for Digital Ocean Spaces file uploads."""

import asyncio
import logging
import uuid
from typing import Annotated
from urllib.parse import urlparse

import boto3
from botocore.exceptions import ClientError
from fastapi import Depends, UploadFile

from app.constants.storage import ALLOWED_IMAGE_EXTENSIONS, MAX_IMAGES_PER_POST
from app.core.exceptions import (
    delete_error,
    invalid_file_type_error,
    too_many_images_error,
    upload_error,
)
from app.core.settings import AnnotatedSettings, Settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for uploading files to Digital Ocean Spaces (S3-compatible)."""

    def __init__(self, settings: Settings) -> None:
        """Initialize the StorageService.

        Args:
            settings: Application settings.
        """
        self._settings = settings
        self.enabled = all(
            [
                self._settings.DO_SPACES_KEY,
                self._settings.DO_SPACES_SECRET,
                self._settings.DO_SPACES_BUCKET,
                self._settings.DO_SPACES_REGION,
            ]
        )

        if self.enabled:
            self.bucket = self._settings.DO_SPACES_BUCKET
            self.cdn_url = self._settings.do_spaces_cdn_url
            self.client = boto3.client(
                "s3",
                endpoint_url=self._settings.do_spaces_endpoint,
                aws_access_key_id=self._settings.DO_SPACES_KEY,
                aws_secret_access_key=self._settings.DO_SPACES_SECRET,
                region_name=self._settings.DO_SPACES_REGION,
            )
        else:
            logger.warning("DO Spaces not configured - image uploads disabled")
            self.bucket = None
            self.cdn_url = None
            self.client = None

    def _get_file_extension(self, filename: str) -> str | None:
        """Extract and validate file extension."""
        if not filename or "." not in filename:
            return None
        ext = filename.rsplit(".", 1)[-1].lower()
        return ext if ext in ALLOWED_IMAGE_EXTENSIONS else None

    async def upload_image(self, file: UploadFile, folder: str = "posts") -> str | None:
        """
        Upload an image to Digital Ocean Spaces.

        Args:
            file: The uploaded file from FastAPI.
            folder: The folder/prefix to store the file in.

        Returns:
            The public CDN URL of the uploaded file, or None if disabled/invalid.

        Raises:
            InvalidFileTypeError: If file extension is not allowed.
            UploadError: If upload to storage fails.
        """
        if not file or not file.filename:
            return None

        if not self.enabled:
            logger.warning("Image upload skipped - DO Spaces not configured")
            return None

        file_ext = self._get_file_extension(file.filename)
        if not file_ext:
            raise invalid_file_type_error(
                f"Invalid file type. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
            )

        unique_filename = f"{folder}/{uuid.uuid4()}.{file_ext}"

        try:
            await asyncio.to_thread(
                self.client.upload_fileobj,
                file.file,
                self.bucket,
                unique_filename,
                ExtraArgs={
                    "ACL": "public-read",
                    "ContentType": file.content_type or "image/jpeg",
                },
            )
            return f"{self.cdn_url}/{unique_filename}"

        except ClientError as e:
            logger.error(f"Failed to upload file to DO Spaces: {e}")
            raise upload_error("Failed to upload image to storage") from e

    async def upload_images(
        self, files: list[UploadFile], folder: str = "posts"
    ) -> list[str]:
        """
        Upload multiple images concurrently.

        Args:
            files: List of uploaded files from FastAPI.
            folder: The folder/prefix to store files in.

        Returns:
            List of public CDN URLs for successfully uploaded files.

        Raises:
            TooManyImagesError: If more than MAX_IMAGES_PER_POST are provided.
            InvalidFileTypeError: If any file has an invalid extension.
            UploadError: If any upload fails.
        """
        # Filter out empty files
        valid_files = [f for f in files if f and f.filename]

        if len(valid_files) > MAX_IMAGES_PER_POST:
            raise too_many_images_error(f"Maximum {MAX_IMAGES_PER_POST} images allowed")

        # Validate all extensions before uploading
        for f in valid_files:
            ext = self._get_file_extension(f.filename)  # type: ignore
            if not ext:
                raise invalid_file_type_error(
                    f"Invalid file type for '{f.filename}'. Allowed: {', '.join(sorted(ALLOWED_IMAGE_EXTENSIONS))}"
                )

        tasks = [self.upload_image(f, folder) for f in valid_files]
        results = await asyncio.gather(*tasks)
        return [url for url in results if url]

    async def delete_image(self, image_url: str) -> None:
        """
        Delete an image from Digital Ocean Spaces.

        Args:
            image_url: The full CDN URL of the image.

        Raises:
            DeleteError: If deletion fails.
        """
        if not self.enabled or not image_url:
            return

        try:
            key = urlparse(image_url).path.lstrip("/")
            await asyncio.to_thread(
                self.client.delete_object,
                Bucket=self.bucket,
                Key=key,
            )

        except ClientError as e:
            logger.error(f"Failed to delete file from DO Spaces: {e}")
            raise delete_error("Failed to delete image from storage") from e


def _get_storage_service(
    settings: AnnotatedSettings,
) -> StorageService:
    """Factory function to create StorageService instance."""
    return StorageService(settings)


AnnotatedStorageService = Annotated[StorageService, Depends(_get_storage_service)]
