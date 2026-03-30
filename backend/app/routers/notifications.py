from typing import List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import db
from app.deps import get_current_user_or_child
from app.models import NotificationResponse

router = APIRouter(prefix="/notifications", tags=["notifications"])


class NotificationsDeleteManyBody(BaseModel):
    ids: List[str]


def _base_scope_query(current_user: dict) -> dict:
    family_id = current_user.get("family_id")
    if not family_id:
        raise HTTPException(status_code=400, detail="No tienes una familia")
    if current_user.get("is_child_session"):
        cid = current_user.get("child_id")
        return {
            "family_id": family_id,
            "$or": [
                {"child_id": cid},
                {"child_id": None},
                {"child_id": {"$exists": False}},
            ],
        }
    return {"family_id": family_id}


@router.get("", response_model=List[NotificationResponse])
async def get_notifications(
    unread_only: bool = False,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Obtener notificaciones de la familia"""
    query = _base_scope_query(current_user)
    if unread_only:
        query["is_read"] = False

    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**n) for n in notifications]


@router.post("/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user_or_child)):
    """Marcar todas las notificaciones como leídas"""
    await db.notifications.update_many(_base_scope_query(current_user), {"$set": {"is_read": True}})
    return {"message": "Todas las notificaciones marcadas como leídas"}


@router.get("/count")
async def get_unread_count(current_user: dict = Depends(get_current_user_or_child)):
    """Obtener cantidad de notificaciones no leídas"""
    query = _base_scope_query(current_user)
    query["is_read"] = False
    count = await db.notifications.count_documents(query)
    return {"unread_count": count}


@router.post("/{notification_id}/read")
async def mark_notification_read(
    notification_id: str,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Marcar notificación como leída"""
    query = _base_scope_query(current_user)
    query["id"] = notification_id
    await db.notifications.update_one(query, {"$set": {"is_read": True}})
    return {"message": "Notificación marcada como leída"}


@router.delete("")
async def delete_all_notifications(current_user: dict = Depends(get_current_user_or_child)):
    """Eliminar todas las notificaciones de la familia."""
    result = await db.notifications.delete_many(_base_scope_query(current_user))
    return {"deleted_count": int(result.deleted_count)}


@router.delete("/bulk")
async def delete_selected_notifications(
    body: NotificationsDeleteManyBody,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Eliminar notificaciones seleccionadas por ID."""
    ids = [x for x in (body.ids or []) if isinstance(x, str) and x.strip()]
    if not ids:
        return {"deleted_count": 0}
    query = _base_scope_query(current_user)
    query["id"] = {"$in": ids}
    result = await db.notifications.delete_many(query)
    return {"deleted_count": int(result.deleted_count)}
