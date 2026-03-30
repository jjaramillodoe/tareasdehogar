import uuid
from datetime import datetime
from typing import Any, Optional

from app.config import db


async def log_audit_event(
    *,
    family_id: Optional[str],
    action: str,
    actor_user_id: Optional[str] = None,
    actor_child_id: Optional[str] = None,
    target_type: Optional[str] = None,
    target_id: Optional[str] = None,
    metadata: Optional[dict[str, Any]] = None,
) -> None:
    if not family_id:
        return
    await db.audit_logs.insert_one(
        {
            "id": str(uuid.uuid4()),
            "family_id": family_id,
            "action": action,
            "actor_user_id": actor_user_id,
            "actor_child_id": actor_child_id,
            "target_type": target_type,
            "target_id": target_id,
            "metadata": metadata or {},
            "created_at": datetime.utcnow(),
        }
    )
