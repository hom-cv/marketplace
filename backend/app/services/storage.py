"""Storage service for Digital Ocean Spaces file uploads."""

import asyncio
import logging
import uuid
from io import BytesIO

from fastapi import UploadFile

from app.core.settings import get_settings

logger = logging.getLogger(__name__)


class StorageService:
    """Service for uploading files to Digital Ocean Spaces (S3-compatible)."""

    def __init__(self) -> None:
        settings = get_settings()
        self.enabled = all([
            settings.DO_SPACES_KEY,
            settings.DO_SPACES_SECRET,
            settings.DO_SPACES_BUCKET,
            settings.DO_SPACES_REGION,
        ])

        if self.enabled:
            import boto3
            self.bucket = settings.DO_SPACES_BUCKET
            self.cdn_url = settings.do_spaces_cdn_url

            self.client = boto3.client(
                "s3",
                endpoint_url=settings.do_spaces_endpoint,
                aws_access_key_id=settings.DO_SPACES_KEY,
                aws_secret_access_key=settings.DO_SPACES_SECRET,
                region_name=settings.DO_SPACES_REGION,
            )
        else:
            logger.warning("DO Spaces not configured - image uploads disabled")
            self.bucket = None
            self.cdn_url = None
            self.client = None

    async def upload_image(
        self,
        file: UploadFile,
        folder: str = "posts",
    ) -> str | None:
        """
        Upload an image to Digital Ocean Spaces.

        Args:
            file: The uploaded file from FastAPI.
            folder: The folder/prefix to store the file in.

        Returns:
            str | None: The public CDN URL of the uploaded file, or None if disabled.

        Raises:
            Exception: If upload fails.
        """
        if not self.enabled:
            logger.warning("Image upload skipped - DO Spaces not configured")
            return None

        from botocore.exceptions import ClientError

        file_ext = file.filename.rsplit(".")[-1].lower() if file.filename and '.' in file.filename else "jpg"
        unique_filename = f"{folder}/{uuid.uuid4()}.{file_ext}"

        try:
            content = await file.read()
            await asyncio.to_thread(
                self.client.upload_fileobj(
                    BytesIO(content),
                    self.bucket,
                    unique_filename,
                    ExtraArgs={
                        "ACL": "public-read",
                        "ContentType": file.content_type or "image/jpeg",
                    },
                )
            )

            return f"{self.cdn_url}/{unique_filename}"

        except ClientError as e:
            logger.error(f"Failed to upload file to DO Spaces: {e}")
            raise Exception("Failed to upload image") from e

    async def delete_image(self, image_url: str) -> None:
        """
        Delete an image from Digital Ocean Spaces.

        Args:
            image_url: The full CDN URL of the image.

        Returns:
            bool: True if deleted successfully.
        """
        if not self.enabled:
            return

        from botocore.exceptions import ClientError

        try:
            key = image_url.replace(f"{self.cdn_url}/", "")

            await asyncio.to_thread(
                self.client.delete_object,
                Bucket=self.bucket,
                Key=key,
            )

        except ClientError as e:
            logger.error(f"Failed to delete file from DO Spaces: {e}")
            raise Exception("Failed to delete image") from e


storage_service = StorageService()
