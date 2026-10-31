from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.deps import get_current_user_or_child
from app.services.media_store import save_upload_bytes

router = APIRouter(prefix="/media", tags=["media"])


@router.post("/evidence")
async def upload_evidence(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_or_child),
):
    """Sube evidencia de tarea: se comprime a JPEG y se guarda en disco."""
    family_id = current_user.get("family_id")
    if not family_id:
        raise HTTPException(status_code=400, detail="Sin familia")

    content_type = (file.content_type or "").lower()
    if content_type and not content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Solo se permiten imágenes")

    raw = await file.read()
    url = save_upload_bytes(raw, family_id=family_id)
    return {"url": url, "ok": True}
