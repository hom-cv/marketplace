"""Storage-related constants."""

# Allowed image extensions for upload
ALLOWED_IMAGE_EXTENSIONS = frozenset({"jpg", "jpeg", "png", "gif", "webp"})

# Maximum number of images per post
MAX_IMAGES_PER_POST = 5

# Allowed upload content types -> stored file extension. Used when issuing
# presigned upload URLs (the client uploads directly to object storage).
CONTENT_TYPE_TO_EXTENSION = {
    "image/jpeg": "jpg",
    "image/jpg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
}
