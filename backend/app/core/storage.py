"""Supabase Storage upload helper (docs/ARCHITECTURE.md §8, docs/SECURITY.md §3).

Uploads are type/size-validated here before ever reaching Supabase; the
database stores only the resulting URL, never a client-supplied path.
"""

import uuid

from fastapi import UploadFile

from app.core.errors import AppError
from app.core.supabase import get_supabase_client

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024  # 5 MB


async def upload_image(bucket: str, file: UploadFile, *, prefix: str = "") -> str:
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise AppError(
            "UNSUPPORTED_FILE_TYPE",
            "Only JPEG, PNG, WEBP, or GIF images are accepted.",
            status_code=400,
        )

    contents = await file.read()
    if len(contents) > MAX_IMAGE_BYTES:
        raise AppError("FILE_TOO_LARGE", "Images must be 5 MB or smaller.", status_code=400)

    extension = (file.filename or "").rsplit(".", 1)[-1].lower() if file.filename else "bin"
    path = f"{prefix}{uuid.uuid4()}.{extension}"

    client = get_supabase_client()
    client.storage.from_(bucket).upload(
        path, contents, file_options={"content-type": file.content_type}
    )
    return client.storage.from_(bucket).get_public_url(path)
