from fastapi import HTTPException

from app.config import db

ROLE_LEVEL = {"parent": 1, "admin": 2, "owner": 3}


async def require_family_permission(current_user: dict, permission_key: str, default_role: str):
    """
    Verifica si el usuario cumple el rol mínimo configurado en familia para una acción.
    permission_key ejemplo: "reset_activity", "approve_withdrawals", "edit_goals"
    """
    fid = current_user.get("family_id")
    if not fid:
        raise HTTPException(status_code=400, detail="No tienes una familia")

    family = await db.families.find_one({"id": fid})
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")

    owner_id = family.get("owner_id")
    raw_role = (current_user.get("family_role") or "parent").lower()
    actor_role = "owner" if owner_id and current_user.get("id") == owner_id else raw_role
    actor_level = ROLE_LEVEL.get(actor_role, 1)

    required_role = family.get(f"permission_{permission_key}_min_role") or default_role
    required_level = ROLE_LEVEL.get(required_role, ROLE_LEVEL[default_role])

    if actor_level < required_level:
        raise HTTPException(
            status_code=403,
            detail=f"Permiso insuficiente (requiere rol {required_role})",
        )
    return family
