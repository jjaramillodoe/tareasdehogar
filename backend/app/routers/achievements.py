from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user_or_child
from app.models import AchievementResponse
from app.services.achievements import ACHIEVEMENTS_DEFINITIONS

router = APIRouter(prefix="/achievements", tags=["achievements"])


@router.get("/definitions")
async def get_achievement_definitions(_: dict = Depends(get_current_user_or_child)):
    """Catálogo de logros (padre o hijo autenticado)."""
    return ACHIEVEMENTS_DEFINITIONS


@router.get("/child/{child_id}", response_model=List[AchievementResponse])
async def get_child_achievements(child_id: str, current_user: dict = Depends(get_current_user_or_child)):
    """Logros desbloqueados por un hijo."""
    if current_user.get("is_child_session") and child_id != current_user.get("child_id"):
        raise HTTPException(status_code=403, detail="No autorizado")

    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    achievements = await db.achievements.find({"child_id": child_id}).sort("earned_at", -1).to_list(100)
    return [AchievementResponse(**a) for a in achievements]
