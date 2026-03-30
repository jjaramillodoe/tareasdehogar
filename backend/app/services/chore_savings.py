"""Reparto de pagos por tarea hacia metas de ahorro (configuración por hijo)."""
from dataclasses import dataclass
from typing import Any, Dict, List, Optional

from app.config import db


@dataclass
class ChoreSavingsSplit:
    to_balance: float
    to_savings: float
    savings_goal_id: Optional[str]
    goal_title: Optional[str]
    goal_just_completed: bool
    milestones_crossed: List[int]


def _compute_split(
    child: Optional[Dict[str, Any]],
    goal: Optional[Dict[str, Any]],
    total_pay: float,
    *,
    percent_override: Optional[float] = None,
    amount_override: Optional[float] = None,
) -> ChoreSavingsSplit:
    """Cálculo puro: sin escrituras en BD.
    Si amount_override no es None, se usa como monto deseado a ahorro (acotado).
    Si no, si percent_override no es None, ese %; si no, el % del perfil del hijo.
    """
    total_pay = round(float(total_pay), 2)
    if total_pay <= 0:
        return ChoreSavingsSplit(0.0, 0.0, None, None, False, [])
    if not child:
        return ChoreSavingsSplit(total_pay, 0.0, None, None, False, [])
    if not goal:
        return ChoreSavingsSplit(total_pay, 0.0, None, None, False, [])

    saved = float(goal.get("saved_amount", 0))
    target = float(goal["target_amount"])
    remaining = max(0.0, target - saved)
    if remaining <= 0:
        return ChoreSavingsSplit(total_pay, 0.0, None, None, False, [])

    raw_savings: float
    if amount_override is not None:
        raw_savings = round(min(float(amount_override), total_pay), 2)
    else:
        pct = float(percent_override) if percent_override is not None else float(child.get("savings_on_approve_percent") or 0)
        if pct <= 0:
            return ChoreSavingsSplit(total_pay, 0.0, None, None, False, [])
        raw_savings = round(total_pay * pct / 100.0, 2)

    if raw_savings <= 0:
        return ChoreSavingsSplit(total_pay, 0.0, None, None, False, [])

    to_savings = round(min(raw_savings, remaining), 2)
    to_balance = round(total_pay - to_savings, 2)

    was_completed = bool(goal.get("is_completed", False))
    new_saved = round(saved + to_savings, 2)
    now_completed = new_saved >= target

    return ChoreSavingsSplit(
        to_balance=to_balance,
        to_savings=to_savings,
        savings_goal_id=goal["id"],
        goal_title=goal.get("title"),
        goal_just_completed=(not was_completed) and now_completed,
        milestones_crossed=[],
    )


async def _resolve_target_goal(child_id: str, family_id: str, preferred_id: Optional[str]):
    if preferred_id:
        g = await db.savings_goals.find_one(
            {"id": preferred_id, "child_id": child_id, "family_id": family_id}
        )
        if g and not g.get("is_completed", False):
            return g

    return await db.savings_goals.find_one(
        {"child_id": child_id, "family_id": family_id, "is_completed": False},
        sort=[("created_at", 1)],
    )


async def preview_chore_savings_split(
    child_id: str,
    family_id: str,
    total_pay: float,
    *,
    percent_override: Optional[float] = None,
    amount_override: Optional[float] = None,
    goal_id_override: Optional[str] = None,
) -> ChoreSavingsSplit:
    """Vista previa del reparto (misma lógica que al aprobar, sin modificar BD)."""
    child = await db.children.find_one({"id": child_id, "family_id": family_id})
    if not child:
        return _compute_split(None, None, total_pay)
    preferred = goal_id_override if goal_id_override else child.get("savings_on_approve_goal_id")
    goal = await _resolve_target_goal(child_id, family_id, preferred)
    return _compute_split(
        child,
        goal,
        total_pay,
        percent_override=percent_override,
        amount_override=amount_override,
    )


async def apply_chore_savings_split(
    child_id: str,
    family_id: str,
    total_pay: float,
    *,
    percent_override: Optional[float] = None,
    amount_override: Optional[float] = None,
    goal_id_override: Optional[str] = None,
) -> ChoreSavingsSplit:
    """Aplica el reparto: actualiza la meta de ahorro. El saldo del hijo lo incrementa el router de tareas."""
    child = await db.children.find_one({"id": child_id, "family_id": family_id})
    if not child:
        return _compute_split(None, None, total_pay)
    preferred = goal_id_override if goal_id_override else child.get("savings_on_approve_goal_id")
    goal = await _resolve_target_goal(child_id, family_id, preferred)
    split = _compute_split(
        child,
        goal,
        total_pay,
        percent_override=percent_override,
        amount_override=amount_override,
    )

    if split.to_savings > 0 and split.savings_goal_id and goal:
        saved = float(goal.get("saved_amount", 0))
        new_saved = round(saved + split.to_savings, 2)
        target = float(goal["target_amount"])
        now_completed = new_saved >= target
        old_milestones = [int(x) for x in (goal.get("milestones_reached") or [])]
        prev_pct = (saved / target) * 100.0 if target > 0 else 0
        next_pct = (new_saved / target) * 100.0 if target > 0 else 0
        crossed: List[int] = []
        for m in (25, 50, 75, 100):
            if m in old_milestones:
                continue
            if prev_pct < m <= next_pct:
                crossed.append(m)
        await db.savings_goals.update_one(
            {"id": goal["id"]},
            {
                "$set": {
                    "saved_amount": new_saved,
                    "is_completed": now_completed,
                    "milestones_reached": old_milestones + crossed,
                    "last_milestone_reached": (crossed[-1] if crossed else goal.get("last_milestone_reached")),
                }
            },
        )
        split.milestones_crossed = crossed

    return split
