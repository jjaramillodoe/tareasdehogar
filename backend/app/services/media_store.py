"""Persist chore evidence images to disk (compressed), not as base64 in Mongo."""

from __future__ import annotations

import base64
import io
import re
import uuid
from pathlib import Path

from fastapi import HTTPException
from PIL import Image

from app.config import ROOT_DIR

UPLOAD_DIR = ROOT_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

_DATA_URI_RE = re.compile(r"^data:(image/[\w.+-]+);base64,(.+)$", re.DOTALL | re.IGNORECASE)
MAX_EDGE = 1280
JPEG_QUALITY = 78


def public_upload_url(filename: str) -> str:
    return f"/uploads/{filename}"


def _compress_and_save(raw: bytes, *, preferred_stem: str | None = None) -> str:
    try:
        img = Image.open(io.BytesIO(raw))
        img = img.convert("RGB")
    except Exception as exc:
        raise HTTPException(status_code=400, detail="Imagen inválida") from exc

    w, h = img.size
    scale = min(1.0, MAX_EDGE / max(w, h, 1))
    if scale < 1.0:
        img = img.resize((max(1, int(w * scale)), max(1, int(h * scale))), Image.Resampling.LANCZOS)

    stem = preferred_stem or uuid.uuid4().hex
    filename = f"{stem}.jpg"
    path = UPLOAD_DIR / filename
    img.save(path, format="JPEG", quality=JPEG_QUALITY, optimize=True)
    return public_upload_url(filename)


def save_upload_bytes(raw: bytes, *, family_id: str) -> str:
    if not raw:
        raise HTTPException(status_code=400, detail="Archivo vacío")
    if len(raw) > 8_000_000:
        raise HTTPException(status_code=400, detail="La imagen es demasiado grande")
    stem = f"{family_id[:8]}_{uuid.uuid4().hex[:12]}"
    return _compress_and_save(raw, preferred_stem=stem)


def persist_photo_reference(photo: str | None, *, family_id: str) -> str | None:
    """
    Normalize evidence into a stored /uploads/... URL.
    Accepts existing upload URLs or data URIs; rejects other schemes.
    """
    if not photo:
        return None
    value = photo.strip()
    if not value:
        return None

    if value.startswith("/uploads/"):
        name = value.split("/uploads/", 1)[-1]
        if ".." in name or "/" in name or "\\" in name:
            raise HTTPException(status_code=400, detail="Ruta de imagen inválida")
        if not (UPLOAD_DIR / name).is_file():
            raise HTTPException(status_code=400, detail="Imagen no encontrada")
        return public_upload_url(name)

    if value.startswith("http://") or value.startswith("https://"):
        # Allow absolute URLs pointing at our uploads path only
        marker = "/uploads/"
        if marker not in value:
            raise HTTPException(status_code=400, detail="URL de imagen no permitida")
        name = value.split(marker, 1)[-1].split("?", 1)[0]
        if ".." in name or "/" in name or "\\" in name:
            raise HTTPException(status_code=400, detail="URL de imagen inválida")
        return public_upload_url(name)

    match = _DATA_URI_RE.match(value)
    if match:
        try:
            raw = base64.b64decode(match.group(2), validate=False)
        except Exception as exc:
            raise HTTPException(status_code=400, detail="Foto en base64 inválida") from exc
        return save_upload_bytes(raw, family_id=family_id)

    raise HTTPException(
        status_code=400,
        detail="Envía la foto como archivo (/media/evidence) o data URI de imagen",
    )
