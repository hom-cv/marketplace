"""Unit tests for ListingService._validate_image_urls.

Covers the defense-in-depth checks on submitted image URLs: prefix ownership,
object existence (HEAD), and the size cap.
"""

from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException

from app.services.listing_service import ListingService

CDN = "https://cdn.example.com"
MAX_BYTES = 10 * 1024 * 1024


def _make_service(object_size: int | None) -> ListingService:
    storage = MagicMock()
    storage.cdn_url = CDN
    storage.get_object_size = AsyncMock(return_value=object_size)
    settings = MagicMock()
    settings.MAX_UPLOAD_BYTES = MAX_BYTES
    return ListingService(
        MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock(),
        storage, settings,
    )


async def test_accepts_owned_existing_image():
    service = _make_service(object_size=1024)
    await service._validate_image_urls([f"{CDN}/posts/a.jpg"])  # no raise


async def test_rejects_foreign_url():
    service = _make_service(object_size=1024)
    with pytest.raises(HTTPException) as exc:
        await service._validate_image_urls(["https://evil.example/posts/a.jpg"])
    assert exc.value.status_code == 400


async def test_rejects_missing_object():
    service = _make_service(object_size=None)  # HEAD found nothing
    with pytest.raises(HTTPException) as exc:
        await service._validate_image_urls([f"{CDN}/posts/ghost.jpg"])
    assert exc.value.status_code == 400


async def test_rejects_oversized_object():
    service = _make_service(object_size=MAX_BYTES + 1)
    with pytest.raises(HTTPException) as exc:
        await service._validate_image_urls([f"{CDN}/posts/huge.jpg"])
    assert exc.value.status_code == 400
