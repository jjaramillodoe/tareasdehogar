import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.models import GoalCreate, GoalResponse, GoalUpdate
from app.services.notifications import create_notification
from app.services.permissions import require_family_permission

router = APIRouter(prefix="/goals", tags=["goals"])


@router.post("", response_model=GoalResponse)
async def create_goal(goal_data: GoalCreate, current_user: dict = Depends(get_current_user)):
    """Crear una nueva meta para un hijo"""
    await require_family_permission(current_user, "edit_goals", "parent")
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")

    child = await db.children.find_one({"id": goal_data.child_id, "family_id": current_user["family_id"]})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    if goal_data.goal_period not in ("semanal", "personalizado"):
        raise HTTPException(status_code=400, detail="goal_period debe ser semanal o personalizado")

    goal_id = str(uuid.uuid4())
    goal = {
        "id": goal_id,
        "title": goal_data.title,
        "description": goal_data.description,
        "target_tasks": goal_data.target_tasks,
        "bonus_amount": goal_data.bonus_amount,
        "child_id": goal_data.child_id,
        "completed_tasks": 0,
        "is_completed": False,
        "bonus_paid": False,
        "start_date": datetime.fromisoformat(goal_data.start_date) if goal_data.start_date else datetime.utcnow(),
        "end_date": datetime.fromisoformat(goal_data.end_date) if goal_data.end_date else None,
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
        "goal_period": goal_data.goal_period,
    }
    await db.goals.insert_one(goal)

    await create_notification(
        current_user["family_id"],
        "goal_created",
        "Nueva meta creada",
        f"Se ha creado la meta '{goal_data.title}' para {child['name']}",
        goal_data.child_id,
    )

    return GoalResponse(**goal)


@router.get("", response_model=List[GoalResponse])
async def get_goals(child_id: Optional[str] = None, current_user: dict = Depends(get_current_user_or_child)):
    """Obtener todas las metas de la familia (el hijo solo ve las suyas)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    query = {"family_id": current_user["family_id"]}
    if current_user.get("is_child_session"):
        query["child_id"] = current_user["child_id"]
    elif child_id:
        query["child_id"] = child_id

    goals = await db.goals.find(query).sort("created_at", -1).to_list(100)
    out = []
    for g in goals:
        if "goal_period" not in g:
            g = {**g, "goal_period": "personalizado"}
        out.append(GoalResponse(**g))
    return out


@router.get("/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, current_user: dict = Depends(get_current_user_or_child)):
    """Obtener una meta específica"""
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if current_user.get("is_child_session") and goal.get("child_id") != current_user.get("child_id"):
        raise HTTPException(status_code=403, detail="No autorizado")
    if "goal_period" not in goal:
        goal = {**goal, "goal_period": "personalizado"}
    return GoalResponse(**goal)


@router.put("/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal_data: GoalUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar una meta"""
    await require_family_permission(current_user, "edit_goals", "parent")
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    update_data = {k: v for k, v in goal_data.model_dump(exclude_unset=True).items() if v is not None}
    if update_data:
        await db.goals.update_one({"id": goal_id}, {"$set": update_data})

    updated = await db.goals.find_one({"id": goal_id})
    if updated and "goal_period" not in updated:
        updated = {**updated, "goal_period": "personalizado"}
    return GoalResponse(**updated)


@router.delete("/{goal_id}")
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una meta"""
    await require_family_permission(current_user, "edit_goals", "parent")
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    await db.goals.delete_one({"id": goal_id})
    return {"message": "Meta eliminada correctamente"}


@router.post("/{goal_id}/pay-bonus", response_model=GoalResponse)
async def pay_goal_bonus(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Pagar el bono de una meta completada"""
    await require_family_permission(current_user, "edit_goals", "parent")
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    if not goal["is_completed"]:
        raise HTTPException(status_code=400, detail="La meta aún no está completada")

    if goal["bonus_paid"]:
        raise HTTPException(status_code=400, detail="El bono ya fue pagado")

    await db.children.update_one({"id": goal["child_id"]}, {"$inc": {"balance": goal["bonus_amount"]}})

    await db.goals.update_one({"id": goal_id}, {"$set": {"bonus_paid": True}})

    payment = {
        "id": str(uuid.uuid4()),
        "child_id": goal["child_id"],
        "chore_id": goal_id,
        "chore_title": f"Bono: {goal['title']}",
        "amount": goal["bonus_amount"],
        "status": "aprobado",
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
        "payment_type": "goal_bonus",
        "purpose_note": None,
        "quality_bonus": 0.0,
        "withdrawal_id": None,
    }
    await db.payments.insert_one(payment)

    child = await db.children.find_one({"id": goal["child_id"]})
    await create_notification(
        current_user["family_id"],
        "bonus_paid",
        "¡Bono pagado!",
        f"{child['name']} recibió un bono de {goal['bonus_amount']} por completar la meta '{goal['title']}'",
        goal["child_id"],
    )

    updated = await db.goals.find_one({"id": goal_id})
    if updated and "goal_period" not in updated:
        updated = {**updated, "goal_period": "personalizado"}
    return GoalResponse(**updated)
