"""Unit tests for StorageService presigned upload signing.

The security-critical property is that the presigned POST policy carries a
``content-length-range`` condition, so Spaces rejects oversized bodies at write
time (the client-side cap is not a boundary).
"""

from unittest.mock import MagicMock, patch

from app.services.storage_service import StorageService


def _make_service(max_bytes: int = 10 * 1024 * 1024) -> tuple[StorageService, MagicMock]:
    settings = MagicMock()
    settings.DO_SPACES_KEY = "key"
    settings.DO_SPACES_SECRET = "secret"
    settings.DO_SPACES_BUCKET = "bucket"
    settings.DO_SPACES_REGION = "sgp1"
    settings.do_spaces_endpoint = "https://sgp1.digitaloceanspaces.com"
    settings.do_spaces_cdn_url = "https://cdn.example.com"
    settings.MAX_UPLOAD_BYTES = max_bytes

    with patch("app.services.storage_service.boto3.client") as mock_boto:
        client = MagicMock()
        mock_boto.return_value = client
        service = StorageService(settings)
    return service, client


def test_presign_enforces_content_length_range():
    service, client = _make_service(max_bytes=5_000_000)
    client.generate_presigned_post.return_value = {
        "url": "https://upload.example/",
        "fields": {"key": "posts/x.jpg"},
    }

    result = service.create_presigned_upload("image/jpeg")

    _, kwargs = client.generate_presigned_post.call_args
    assert ["content-length-range", 0, 5_000_000] in kwargs["Conditions"]
    assert {"Content-Type": "image/jpeg"} in kwargs["Conditions"]
    assert result["file_url"].startswith("https://cdn.example.com/posts/")
    assert result["file_url"].endswith(".jpg")
    assert "fields" in result and "url" in result
