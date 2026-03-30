from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.services.spendable import get_cooldown_locked_amount

router = APIRouter(prefix="/stats", tags=["stats"])


def _month_start_utc(now: datetime) -> datetime:
    return datetime(now.year, now.month, 1)


async def _compute_family_savings_challenge(family_id: str) -> dict:
    family_doc = await db.families.find_one({"id": family_id}) or {}
    target = float(family_doc.get("family_challenge_target_percent") or 15.0)
    children = await db.children.find({"family_id": family_id}).to_list(200)

    now = datetime.utcnow()
    month_start = _month_start_utc(now)
    month_key = month_start.strftime("%Y-%m")
    month_payments = await db.payments.find(
        {
            "family_id": family_id,
            "created_at": {"$gte": month_start},
            "reversed_at": {"$exists": False},
        }
    ).to_list(3000)

    month_by_child = {}
    for p in month_payments:
        if p.get("payment_type") != "chore":
            continue
        cid = p.get("child_id")
        if not cid:
            continue
        row = month_by_child.setdefault(cid, {"earned": 0.0, "saved": 0.0})
        row["earned"] += float(p.get("amount") or 0.0)
        row["saved"] += float(p.get("savings_allocated") or 0.0)

    children_rows = []
    applicable = []
    for c in children:
        cid = c["id"]
        earned = float(month_by_child.get(cid, {}).get("earned", 0.0))
        saved = float(month_by_child.get(cid, {}).get("saved", 0.0))
        pct = (saved / earned * 100.0) if earned > 0 else 0.0
        hit = earned > 0 and pct >= target
        entry = {
            "child_id": cid,
            "name": c.get("name"),
            "earned": round(earned, 2),
            "saved": round(saved, 2),
            "saved_percent": round(pct, 2),
            "hit_target": hit,
        }
        children_rows.append(entry)
        if earned > 0:
            applicable.append(entry)

    all_hit = len(applicable) > 0 and all(x["hit_target"] for x in applicable)
    month_doc = {
        "family_id": family_id,
        "month_key": month_key,
        "target_percent": target,
        "all_children_hit_target": all_hit,
        "updated_at": now,
    }
    await db.family_challenge_history.update_one(
        {"family_id": family_id, "month_key": month_key},
        {"$set": month_doc, "$setOnInsert": {"created_at": now}},
        upsert=True,
    )
    history_docs = await db.family_challenge_history.find({"family_id": family_id}).sort("month_key", -1).to_list(6)
    history = [
        {
            "month_key": d.get("month_key"),
            "target_percent": float(d.get("target_percent") or 0),
            "all_children_hit_target": bool(d.get("all_children_hit_target")),
        }
        for d in history_docs
    ]
    return {
        "target_percent": target,
        "period": f"{month_start.date().isoformat()}..{now.date().isoformat()}",
        "all_children_hit_target": all_hit,
        "children": children_rows,
        "history": history,
    }


@router.get("/child/{child_id}")
async def get_child_stats(child_id: str, current_user: dict = Depends(get_current_user_or_child)):
    """Obtener estadísticas de un hijo"""
    if current_user.get("is_child_session") and child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    pending = await db.chores.count_documents({"assigned_to": child_id, "status": "pendiente"})
    completed = await db.chores.count_documents(
        {"completed_by": child_id, "status": {"$in": ["completada", "aprobada"]}}
    )
    approved = await db.chores.count_documents({"completed_by": child_id, "status": "aprobada"})

    streak = child.get("current_streak", 0)
    best_streak = child.get("best_streak", 0)
    balance = float(child.get("balance", 0.0))
    locked = await get_cooldown_locked_amount(child_id, current_user.get("family_id"))
    available_now = round(max(0.0, balance - locked), 2)
    family_challenge = await _compute_family_savings_challenge(current_user.get("family_id"))

    return {
        "child_id": child_id,
        "balance": balance,
        "available_balance": available_now,
        "cooldown_locked_amount": locked,
        "pending_tasks": pending,
        "completed_tasks": completed,
        "approved_tasks": approved,
        "current_streak": streak,
        "best_streak": best_streak,
        "savings_current_streak": int(child.get("savings_current_streak", 0) or 0),
        "savings_best_streak": int(child.get("savings_best_streak", 0) or 0),
        "family_savings_challenge": family_challenge,
    }


@router.get("/family/report")
async def get_family_report(days: int = 7, current_user: dict = Depends(get_current_user)):
    """Obtener reporte de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    family_id = current_user["family_id"]
    start_date = datetime.utcnow() - timedelta(days=days)

    children = await db.children.find({"family_id": family_id}).to_list(100)

    tasks_in_period = await db.chores.find(
        {"family_id": family_id, "status": "aprobada", "completed_at": {"$gte": start_date}}
    ).to_list(1000)

    payments_in_period = await db.payments.find(
        {
            "family_id": family_id,
            "created_at": {"$gte": start_date},
            "reversed_at": {"$exists": False},
        }
    ).to_list(1000)

    daily_stats = {}
    for i in range(days):
        day = datetime.utcnow() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        daily_stats[day_str] = {"tasks_completed": 0, "amount_paid": 0.0}

    for task in tasks_in_period:
        if task.get("completed_at"):
            day_str = task["completed_at"].strftime("%Y-%m-%d")
            if day_str in daily_stats:
                daily_stats[day_str]["tasks_completed"] += 1

    for payment in payments_in_period:
        day_str = payment["created_at"].strftime("%Y-%m-%d")
        if day_str in daily_stats:
            daily_stats[day_str]["amount_paid"] += payment["amount"]

    children_stats = []
    for child in children:
        child_tasks = [t for t in tasks_in_period if t.get("completed_by") == child["id"]]
        child_payments = [p for p in payments_in_period if p.get("child_id") == child["id"]]
        children_stats.append(
            {
                "child_id": child["id"],
                "name": child["name"],
                "gender": child.get("gender"),
                "tasks_completed": len(child_tasks),
                "amount_earned": sum(p["amount"] for p in child_payments),
                "balance": child.get("balance", 0.0),
                "current_streak": child.get("current_streak", 0),
            }
        )

    family_challenge = await _compute_family_savings_challenge(family_id)

    return {
        "period_days": days,
        "total_tasks_completed": len(tasks_in_period),
        "total_amount_paid": sum(p["amount"] for p in payments_in_period),
        "daily_stats": daily_stats,
        "children_stats": children_stats,
        "family_savings_challenge": family_challenge,
    }
