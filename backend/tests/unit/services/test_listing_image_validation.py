"""Unit tests for ListingService._validate_image_urls.

Covers the ownership check on submitted image URLs: every URL must live under
our CDN's ``posts/`` prefix. The size cap is enforced upstream by the presigned
POST policy, not here.
"""

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.listing_service import ListingService

CDN = "https://cdn.example.com"


def _make_service() -> ListingService:
    storage = MagicMock()
    storage.cdn_url = CDN
    return ListingService(
        MagicMock(), MagicMock(), MagicMock(), MagicMock(), MagicMock(), storage
    )


def test_accepts_owned_image():
    service = _make_service()
    service._validate_image_urls([f"{CDN}/posts/a.jpg"])  # no raise


def test_rejects_foreign_url():
    service = _make_service()
    with pytest.raises(HTTPException) as exc:
        service._validate_image_urls(["https://evil.example/posts/a.jpg"])
    assert exc.value.status_code == 400


def test_rejects_path_traversal():
    service = _make_service()
    with pytest.raises(HTTPException) as exc:
        service._validate_image_urls([f"{CDN}/posts/../secrets/a.jpg"])
    assert exc.value.status_code == 400


def test_rejects_encoded_path_traversal():
    service = _make_service()
    with pytest.raises(HTTPException) as exc:
        service._validate_image_urls([f"{CDN}/posts/..%2f..%2fsecrets.jpg"])
    assert exc.value.status_code == 400


def test_rejects_look_alike_host():
    service = _make_service()
    with pytest.raises(HTTPException) as exc:
        service._validate_image_urls(["https://cdn.example.com.evil.test/posts/a.jpg"])
    assert exc.value.status_code == 400
