import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.models import SavingsGoalCreate, SavingsGoalResponse, SavingsGoalUpdate, SavingsTransferBody
from app.services.notifications import create_notification

router = APIRouter(prefix="/savings-goals", tags=["savings-goals"])


def _to_response(doc: dict) -> SavingsGoalResponse:
    return SavingsGoalResponse(
        id=doc["id"],
        title=doc["title"],
        note=doc.get("note"),
        target_amount=float(doc["target_amount"]),
        saved_amount=float(doc.get("saved_amount", 0)),
        child_id=doc["child_id"],
        family_id=doc["family_id"],
        created_at=doc["created_at"],
        is_completed=bool(doc.get("is_completed", False)),
        milestones_reached=[int(x) for x in (doc.get("milestones_reached") or [])],
        last_milestone_reached=(
            int(doc["last_milestone_reached"])
            if doc.get("last_milestone_reached") is not None
            else None
        ),
    )


def _is_completed(saved: float, target: float) -> bool:
    return saved >= target


def _milestones_crossed(saved_before: float, saved_after: float, target: float, already: List[int]) -> List[int]:
    if target <= 0:
        return []
    prev_pct = (saved_before / target) * 100.0
    next_pct = (saved_after / target) * 100.0
    out: List[int] = []
    for m in (25, 50, 75, 100):
        if m in already:
            continue
        if prev_pct < m <= next_pct:
            out.append(m)
    return out


@router.post("", response_model=SavingsGoalResponse)
async def create_savings_goal(
    data: SavingsGoalCreate,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")

    child = await db.children.find_one({"id": data.child_id, "family_id": current_user["family_id"]})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    goal_id = str(uuid.uuid4())
    doc = {
        "id": goal_id,
        "title": data.title.strip(),
        "note": data.note.strip() if data.note else None,
        "target_amount": float(data.target_amount),
        "saved_amount": 0.0,
        "child_id": data.child_id,
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
        "is_completed": False,
        "milestones_reached": [],
        "last_milestone_reached": None,
    }
    await db.savings_goals.insert_one(doc)

    await create_notification(
        current_user["family_id"],
        "savings_goal_created",
        "Meta de ahorro",
        f"Nueva meta de ahorro «{doc['title']}» para {child['name']}",
        data.child_id,
    )

    return _to_response(doc)


@router.get("", response_model=List[SavingsGoalResponse])
async def list_savings_goals(
    child_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user_or_child),
):
    fid = current_user.get("family_id")
    if not fid:
        raise HTTPException(status_code=400, detail="Sin familia")

    query: dict = {"family_id": fid}
    if current_user.get("is_child_session"):
        query["child_id"] = current_user["child_id"]
    elif child_id:
        query["child_id"] = child_id

    rows = await db.savings_goals.find(query).sort("created_at", -1).to_list(100)
    return [_to_response(g) for g in rows]


@router.get("/{goal_id}", response_model=SavingsGoalResponse)
async def get_savings_goal(goal_id: str, current_user: dict = Depends(get_current_user_or_child)):
    goal = await db.savings_goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    if current_user.get("is_child_session") and goal["child_id"] != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    return _to_response(goal)


@router.put("/{goal_id}", response_model=SavingsGoalResponse)
async def update_savings_goal(
    goal_id: str,
    data: SavingsGoalUpdate,
    current_user: dict = Depends(get_current_user),
):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Sin familia")

    goal = await db.savings_goals.find_one({"id": goal_id, "family_id": current_user["family_id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    patch = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "title" in patch and isinstance(patch["title"], str):
        patch["title"] = patch["title"].strip()
    if "note" in patch:
        patch["note"] = patch["note"].strip() if patch["note"] else None
    if "target_amount" in patch:
        ta = float(patch["target_amount"])
        saved = float(goal.get("saved_amount", 0))
        if ta < saved:
            raise HTTPException(
                status_code=400,
                detail=f"El objetivo no puede ser menor que lo ahorrado ({saved})",
            )
        patch["target_amount"] = ta
        patch["is_completed"] = _is_completed(saved, ta)

    if patch:
        await db.savings_goals.update_one({"id": goal_id}, {"$set": patch})

    updated = await db.savings_goals.find_one({"id": goal_id})
    return _to_response(updated)


@router.delete("/{goal_id}")
async def delete_savings_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Sin familia")

    goal = await db.savings_goals.find_one({"id": goal_id, "family_id": current_user["family_id"]})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    saved = float(goal.get("saved_amount", 0))
    if saved > 0:
        await db.children.update_one({"id": goal["child_id"]}, {"$inc": {"balance": saved}})

    await db.savings_goals.delete_one({"id": goal_id})
    return {"ok": True, "returned_to_balance": saved}


@router.post("/{goal_id}/allocate", response_model=SavingsGoalResponse)
async def allocate_to_savings_goal(
    goal_id: str,
    body: SavingsTransferBody,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Pasa dinero del saldo disponible del hijo a esta meta de ahorro."""
    fid = current_user.get("family_id")
    if not fid:
        raise HTTPException(status_code=400, detail="Sin familia")

    goal = await db.savings_goals.find_one({"id": goal_id, "family_id": fid})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    if current_user.get("is_child_session") and goal["child_id"] != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    child = await db.children.find_one({"id": goal["child_id"], "family_id": fid})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    amt = float(body.amount)
    bal = float(child.get("balance", 0))
    if bal < amt:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    was_done = bool(goal.get("is_completed", False))
    new_saved = float(goal.get("saved_amount", 0)) + amt
    target = float(goal["target_amount"])
    now_done = _is_completed(new_saved, target)
    old_milestones = [int(x) for x in (goal.get("milestones_reached") or [])]
    crossed = _milestones_crossed(float(goal.get("saved_amount", 0)), new_saved, target, old_milestones)
    updated_milestones = old_milestones + crossed

    await db.children.update_one({"id": goal["child_id"]}, {"$inc": {"balance": -amt}})
    await db.savings_goals.update_one(
        {"id": goal_id},
        {
            "$set": {
                "saved_amount": new_saved,
                "is_completed": now_done,
                "milestones_reached": updated_milestones,
                "last_milestone_reached": (crossed[-1] if crossed else goal.get("last_milestone_reached")),
            }
        },
    )

    for m in crossed:
        if m == 100:
            continue
        await create_notification(
            fid,
            "savings_goal_milestone",
            f"¡Meta al {m}%!",
            f"«{goal['title']}» alcanzó {m}% de avance",
            goal["child_id"],
        )

    if not was_done and now_done:
        await create_notification(
            fid,
            "savings_goal_completed",
            "¡Meta de ahorro alcanzada!",
            f"«{goal['title']}»: objetivo de {target} completado",
            goal["child_id"],
        )

    updated = await db.savings_goals.find_one({"id": goal_id})
    return _to_response(updated)


@router.post("/{goal_id}/release", response_model=SavingsGoalResponse)
async def release_from_savings_goal(
    goal_id: str,
    body: SavingsTransferBody,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Devuelve dinero de la meta al saldo disponible del hijo."""
    fid = current_user.get("family_id")
    if not fid:
        raise HTTPException(status_code=400, detail="Sin familia")

    goal = await db.savings_goals.find_one({"id": goal_id, "family_id": fid})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")

    if current_user.get("is_child_session") and goal["child_id"] != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    amt = float(body.amount)
    saved = float(goal.get("saved_amount", 0))
    if amt > saved:
        raise HTTPException(status_code=400, detail="No hay tanto ahorrado en esta meta")

    new_saved = saved - amt
    target = float(goal["target_amount"])
    now_done = _is_completed(new_saved, target)
    kept = [int(x) for x in (goal.get("milestones_reached") or []) if (new_saved / target) * 100.0 >= x]
    last_kept = kept[-1] if kept else None

    await db.children.update_one({"id": goal["child_id"]}, {"$inc": {"balance": amt}})
    await db.savings_goals.update_one(
        {"id": goal_id},
        {
            "$set": {
                "saved_amount": new_saved,
                "is_completed": now_done,
                "milestones_reached": kept,
                "last_milestone_reached": last_kept,
            }
        },
    )

    updated = await db.savings_goals.find_one({"id": goal_id})
    return _to_response(updated)
