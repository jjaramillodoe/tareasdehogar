import uuid
from datetime import datetime
from typing import Optional

from app.config import db


async def create_notification(
    family_id: str,
    notif_type: str,
    title: str,
    message: str,
    child_id: Optional[str] = None,
):
    family = await db.families.find_one({"id": family_id})
    if family:
        # Preferencias simples por rol destino.
        if child_id and family.get("notifications_enabled_for_children") is False:
            return None
        if not child_id and family.get("notifications_enabled_for_parents") is False:
            return None
        start = family.get("notifications_quiet_hours_start")
        end = family.get("notifications_quiet_hours_end")
        if isinstance(start, int) and isinstance(end, int) and start != end:
            h = datetime.utcnow().hour
            in_quiet = (start <= h < end) if start < end else (h >= start or h < end)
            if in_quiet:
                return None

    notification = {
        "id": str(uuid.uuid4()),
        "type": notif_type,
        "title": title,
        "message": message,
        "child_id": child_id,
        "is_read": False,
        "family_id": family_id,
        "created_at": datetime.utcnow(),
    }
    await db.notifications.insert_one(notification)
    return notification
