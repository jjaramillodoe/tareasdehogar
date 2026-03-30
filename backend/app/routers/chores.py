import uuid
from calendar import monthrange
from datetime import datetime, time, timedelta
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.models import ChoreApprove, ChoreComplete, ChoreCreate, ChoreResponse, ChoreUpdate
from app.services.achievements import award_achievement, update_child_streak, update_goal_progress
from app.services.chore_savings import apply_chore_savings_split, preview_chore_savings_split
from app.services.notifications import create_notification

router = APIRouter(prefix="/chores", tags=["chores"])


def _chore_to_response(c: dict) -> ChoreResponse:
    data = {
        **c,
        "scheduled_date": c.get("scheduled_date"),
        "photo_url": c.get("photo_url"),
        "rating": c.get("rating"),
        "parent_feedback": c.get("parent_feedback"),
        "quality_bonus": float(c.get("quality_bonus") or 0),
    }
    return ChoreResponse(**data)


def _parse_scheduled_date(raw: Optional[str]) -> Optional[datetime]:
    if not raw:
        return None
    try:
        if len(raw) == 10:
            d = datetime.fromisoformat(raw)
            return datetime.combine(d.date(), time.min)
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        raise HTTPException(status_code=400, detail="scheduled_date inválida (usa YYYY-MM-DD)")


async def _update_child_savings_streak(child_id: str, family_id: str):
    """Racha de ahorro semanal: al menos 1 ahorro por semana mantiene la racha."""
    child = await db.children.find_one({"id": child_id, "family_id": family_id})
    if not child:
        return

    today = datetime.utcnow()
    year, week, _ = today.isocalendar()
    current_week_key = f"{year}-W{week:02d}"
    last_week_key = child.get("last_savings_week_key")
    last_savings_date = child.get("last_savings_date")
    current_streak = int(child.get("savings_current_streak", 0) or 0)
    best_streak = int(child.get("savings_best_streak", 0) or 0)

    if not last_week_key and last_savings_date:
        last_dt = (
            last_savings_date
            if isinstance(last_savings_date, datetime)
            else datetime.combine(last_savings_date, time.min)
        )
        y2, w2, _ = last_dt.isocalendar()
        last_week_key = f"{y2}-W{w2:02d}"

    if last_week_key:
        if last_week_key == current_week_key:
            return
        try:
            ly, lw = last_week_key.split("-W")
            last_monday = datetime.fromisocalendar(int(ly), int(lw), 1)
            this_monday = datetime.fromisocalendar(year, week, 1)
            weeks_diff = (this_monday.date() - last_monday.date()).days // 7
        except Exception:
            weeks_diff = 99
        if weeks_diff == 1:
            current_streak += 1
        else:
            current_streak = 1
    else:
        current_streak = 1

    if current_streak > best_streak:
        best_streak = current_streak

    await db.children.update_one(
        {"id": child_id},
        {
            "$set": {
                "last_savings_date": datetime.utcnow(),
                "last_savings_week_key": current_week_key,
                "savings_current_streak": current_streak,
                "savings_best_streak": best_streak,
            }
        },
    )

    if current_streak in (2, 4, 8):
        child_name = child.get("name", "Tu hijo")
        await create_notification(
            family_id,
            "savings_streak",
            "Racha de ahorro",
            f"{child_name} lleva {current_streak} semanas seguidas ahorrando",
            child_id,
        )
    if current_streak == 4:
        await award_achievement(child_id, family_id, "savings_streak_4w")
    if current_streak == 8:
        await award_achievement(child_id, family_id, "savings_streak_8w")


async def _resolve_split_with_auto_save_floor(
    *,
    child_id: str,
    family_id: str,
    total_pay: float,
    savings_percent: Optional[float],
    savings_amount: Optional[float],
    savings_goal_id: Optional[str],
):
    """Aplica regla 'auto-save first':
    si el hijo tiene ahorro automático configurado (>0), no permitir que el reparto final
    envíe menos a ahorro que el reparto por defecto.
    """
    default_split = await preview_chore_savings_split(child_id, family_id, total_pay)
    requested_split = await preview_chore_savings_split(
        child_id,
        family_id,
        total_pay,
        percent_override=savings_percent,
        amount_override=savings_amount,
        goal_id_override=savings_goal_id,
    )
    floor_applied = default_split.to_savings > 0 and requested_split.to_savings < default_split.to_savings
    final_split = default_split if floor_applied else requested_split
    return final_split, floor_applied, default_split


@router.post("", response_model=List[ChoreResponse])
async def create_chore(chore_data: ChoreCreate, current_user: dict = Depends(get_current_user)):
    """Crear una o más tareas (varias si consecutive_days > 1 y hay fecha de inicio)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")

    if chore_data.frequency not in ["unica", "diaria", "semanal"]:
        raise HTTPException(status_code=400, detail="Frecuencia inválida. Use: unica, diaria, semanal")

    n = chore_data.consecutive_days or 1
    if n > 1 and not (chore_data.scheduled_date and chore_data.scheduled_date.strip()):
        raise HTTPException(
            status_code=400,
            detail="Para crear tareas en días consecutivos debes indicar la fecha de inicio en el calendario",
        )

    for child_id in chore_data.assigned_to:
        child = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
        if not child:
            raise HTTPException(status_code=400, detail=f"Hijo con ID {child_id} no encontrado")

    scheduled = _parse_scheduled_date(chore_data.scheduled_date)
    base_date = scheduled.date() if scheduled else None

    created: List[ChoreResponse] = []
    for i in range(n):
        if base_date is not None:
            day_dt = datetime.combine(base_date + timedelta(days=i), time.min)
        else:
            day_dt = None

        title_i = chore_data.title
        if n > 1:
            title_i = f"{chore_data.title} (día {i + 1} de {n})"

        chore_id = str(uuid.uuid4())
        chore: Dict[str, Any] = {
            "id": chore_id,
            "title": title_i,
            "description": chore_data.description,
            "amount": chore_data.amount,
            "frequency": chore_data.frequency,
            "assigned_to": chore_data.assigned_to,
            "status": "pendiente",
            "completed_by": None,
            "completed_at": None,
            "comment": None,
            "family_id": current_user["family_id"],
            "created_at": datetime.utcnow(),
            "scheduled_date": day_dt,
            "photo_url": None,
            "rating": None,
            "parent_feedback": None,
            "quality_bonus": 0.0,
        }
        await db.chores.insert_one(chore)
        created.append(_chore_to_response(chore))

    return created


@router.get("/calendar", response_model=List[dict])
async def get_chores_calendar(
    year: int,
    month: int,
    current_user: dict = Depends(get_current_user),
):
    """Tareas agrupadas por día (scheduled_date) en un mes — vista calendario."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    if month < 1 or month > 12:
        raise HTTPException(status_code=400, detail="Mes inválido")

    start = datetime(year, month, 1)
    last_day = monthrange(year, month)[1]
    end = datetime(year, month, last_day, 23, 59, 59)

    chores = await db.chores.find({"family_id": current_user["family_id"]}).to_list(2000)
    children_docs = await db.children.find({"family_id": current_user["family_id"]}).to_list(100)
    child_map = {
        c["id"]: {"id": c["id"], "name": c["name"], "gender": c.get("gender")}
        for c in children_docs
    }

    by_date: Dict[str, List[dict]] = {}

    for c in chores:
        sd = c.get("scheduled_date")
        if sd is None:
            continue
        try:
            cdt = sd if isinstance(sd, datetime) else datetime.fromisoformat(str(sd)[:19])
        except Exception:
            continue
        if cdt < start or cdt > end:
            continue
        dkey = cdt.date().isoformat()
        if dkey not in by_date:
            by_date[dkey] = []
        chore_dict = _chore_to_response(c).model_dump()
        aids = chore_dict.get("assigned_to") or []
        chore_dict["assigned_children"] = [child_map[cid] for cid in aids if cid in child_map]
        by_date[dkey].append(chore_dict)

    return [{"date": d, "chores": by_date[d]} for d in sorted(by_date.keys())]


@router.get("", response_model=List[ChoreResponse])
async def get_chores(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Obtener todas las tareas de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    query = {"family_id": current_user["family_id"]}
    if status:
        query["status"] = status

    chores = await db.chores.find(query).sort("created_at", -1).to_list(1000)
    return [_chore_to_response(c) for c in chores]


@router.get("/child/{child_id}", response_model=List[ChoreResponse])
async def get_chores_for_child(
    child_id: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user_or_child)
):
    """Obtener tareas asignadas a un hijo específico"""
    if current_user.get("is_child_session") and child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    query = {"family_id": current_user["family_id"], "assigned_to": child_id}
    if status:
        query["status"] = status

    chores = await db.chores.find(query).sort("created_at", -1).to_list(1000)
    return [_chore_to_response(c) for c in chores]


@router.get("/savings-split-preview")
async def savings_split_preview(
    child_id: str,
    amount: float,
    savings_percent: Optional[float] = None,
    savings_amount: Optional[float] = None,
    savings_goal_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Vista previa del reparto saldo / ahorro al aprobar un pago (misma lógica que al aprobar la tarea)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    ch = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
    if not ch:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    pct_ov = savings_percent
    amt_ov = savings_amount
    if amt_ov is not None:
        pct_ov = None
    gid = (savings_goal_id or "").strip() or None

    split, floor_applied, default_split = await _resolve_split_with_auto_save_floor(
        child_id=child_id,
        family_id=current_user["family_id"],
        total_pay=amount,
        savings_percent=pct_ov,
        savings_amount=amt_ov,
        savings_goal_id=gid,
    )
    return {
        "total_pay": round(float(amount), 2),
        "to_balance": split.to_balance,
        "to_savings": split.to_savings,
        "savings_goal_id": split.savings_goal_id,
        "goal_title": split.goal_title,
        "goal_just_completed": split.goal_just_completed,
        "auto_save_floor_applied": floor_applied,
        "auto_save_min_amount": default_split.to_savings if default_split.to_savings > 0 else None,
    }


@router.get("/{chore_id}", response_model=ChoreResponse)
async def get_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener una tarea específica"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    return _chore_to_response(chore)


@router.put("/{chore_id}", response_model=ChoreResponse)
async def update_chore(chore_id: str, chore_data: ChoreUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar una tarea"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    update_data = {k: v for k, v in chore_data.dict().items() if v is not None}
    if "scheduled_date" in update_data:
        update_data["scheduled_date"] = _parse_scheduled_date(update_data.pop("scheduled_date"))

    if "assigned_to" in update_data:
        for cid in update_data["assigned_to"]:
            child = await db.children.find_one({"id": cid, "family_id": current_user["family_id"]})
            if not child:
                raise HTTPException(status_code=400, detail=f"Hijo con ID {cid} no encontrado")

    if update_data:
        await db.chores.update_one({"id": chore_id}, {"$set": update_data})

    updated = await db.chores.find_one({"id": chore_id})
    return _chore_to_response(updated)


@router.delete("/{chore_id}")
async def delete_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una tarea"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    await db.chores.delete_one({"id": chore_id})
    return {"message": "Tarea eliminada correctamente"}


@router.post("/{chore_id}/complete", response_model=ChoreResponse)
async def complete_chore(
    chore_id: str,
    complete_data: ChoreComplete,
    child_id: str,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Marcar una tarea como completada (por un hijo) — opcional foto evidencia."""
    if current_user.get("is_child_session") and child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if child_id not in chore.get("assigned_to", []):
        raise HTTPException(status_code=403, detail="Esta tarea no está asignada a este hijo")

    if chore["status"] != "pendiente":
        raise HTTPException(status_code=400, detail="Esta tarea ya no está pendiente")

    photo = complete_data.photo_url
    if photo and len(photo) > 600_000:
        raise HTTPException(status_code=400, detail="La imagen es demasiado grande")

    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "completada",
                "completed_by": child_id,
                "completed_at": datetime.utcnow(),
                "comment": complete_data.comment,
                "photo_url": photo,
            }
        },
    )

    updated = await db.chores.find_one({"id": chore_id})
    return _chore_to_response(updated)


@router.post("/{chore_id}/approve", response_model=ChoreResponse)
async def approve_chore(
    chore_id: str,
    data: ChoreApprove = Body(default_factory=ChoreApprove),
    current_user: dict = Depends(get_current_user),
):
    """Aprobar una tarea completada — opcional calificación, feedback y bono por calidad."""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if chore["status"] != "completada":
        raise HTTPException(status_code=400, detail="Solo se pueden aprobar tareas completadas")

    qbonus = float(data.quality_bonus or 0)
    total_pay = float(chore["amount"]) + qbonus

    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "aprobada",
                "rating": data.rating,
                "parent_feedback": data.parent_feedback,
                "quality_bonus": qbonus,
            }
        },
    )

    child_id = chore["completed_by"]
    pct_ov = data.savings_percent
    amt_ov = data.savings_amount
    if amt_ov is not None:
        pct_ov = None
    gid = (data.savings_goal_id or "").strip() or None

    split_preview, floor_applied, _ = await _resolve_split_with_auto_save_floor(
        child_id=child_id,
        family_id=current_user["family_id"],
        total_pay=total_pay,
        savings_percent=pct_ov,
        savings_amount=amt_ov,
        savings_goal_id=gid,
    )
    if floor_applied:
        split = await apply_chore_savings_split(
            child_id,
            current_user["family_id"],
            total_pay,
        )
    else:
        split = await apply_chore_savings_split(
            child_id,
            current_user["family_id"],
            total_pay,
            percent_override=pct_ov,
            amount_override=amt_ov,
            goal_id_override=gid,
        )
    await db.children.update_one({"id": child_id}, {"$inc": {"balance": split.to_balance}})
    if split.to_savings > 0:
        await _update_child_savings_streak(child_id, current_user["family_id"])

    payment = {
        "id": str(uuid.uuid4()),
        "child_id": child_id,
        "chore_id": chore_id,
        "chore_title": chore["title"],
        "amount": total_pay,
        "status": "aprobado",
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
        "payment_type": "chore",
        "purpose_note": None,
        "quality_bonus": qbonus,
        "chore_base_amount": float(chore["amount"]),
        "withdrawal_id": None,
        "savings_allocated": split.to_savings if split.to_savings > 0 else None,
        "savings_goal_id": split.savings_goal_id,
        "savings_reason_note": (data.savings_reason_note.strip() if data.savings_reason_note else None),
    }
    await db.payments.insert_one(payment)

    # Bono pequeño por racha semanal de ahorro (opcional, configurable en familia).
    if split.to_savings > 0:
        child_after = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
        streak_weeks = int((child_after or {}).get("savings_current_streak") or 0)
        fam_doc = await db.families.find_one({"id": current_user["family_id"]}) or {}
        streak_bonus_amount = float(fam_doc.get("streak_bonus_amount") or 0)
        if streak_bonus_amount > 0 and streak_weeks > 0 and streak_weeks % 4 == 0:
            await db.children.update_one({"id": child_id}, {"$inc": {"balance": streak_bonus_amount}})
            bonus_payment = {
                "id": str(uuid.uuid4()),
                "child_id": child_id,
                "chore_id": chore_id,
                "chore_title": f"Bono racha ahorro ({streak_weeks} semanas)",
                "amount": streak_bonus_amount,
                "status": "aprobado",
                "family_id": current_user["family_id"],
                "created_at": datetime.utcnow(),
                "payment_type": "savings_streak_bonus",
                "purpose_note": None,
                "quality_bonus": 0.0,
                "withdrawal_id": None,
                "savings_allocated": None,
                "savings_goal_id": None,
                "savings_reason_note": None,
            }
            await db.payments.insert_one(bonus_payment)
            await create_notification(
                current_user["family_id"],
                "savings_streak_bonus",
                "Bono por constancia",
                f"Se otorgo bono de {streak_bonus_amount:.2f} por racha de {streak_weeks} semanas",
                child_id,
            )

    # Match bonus semanal por ahorro (configurable por familia y con tope semanal por hijo).
    fam = await db.families.find_one({"id": current_user["family_id"]})
    match_pct = float((fam or {}).get("savings_match_percent") or 0)
    match_cap = float((fam or {}).get("savings_match_weekly_cap") or 0)
    if split.to_savings > 0 and match_pct > 0 and match_cap > 0:
        now = datetime.utcnow()
        week_start = now - timedelta(days=now.weekday())
        week_start = datetime(week_start.year, week_start.month, week_start.day)
        matched_rows = await db.payments.find(
            {
                "child_id": child_id,
                "family_id": current_user["family_id"],
                "payment_type": "savings_match",
                "created_at": {"$gte": week_start},
                "reversed_at": {"$exists": False},
            }
        ).to_list(200)
        already_matched = sum(float(r.get("amount") or 0) for r in matched_rows)
        remaining_cap = max(0.0, round(match_cap - already_matched, 2))
        if remaining_cap > 0:
            desired_match = round(split.to_savings * match_pct / 100.0, 2)
            granted_match = min(desired_match, remaining_cap)
            if granted_match > 0:
                await db.children.update_one({"id": child_id}, {"$inc": {"balance": granted_match}})
                match_payment = {
                    "id": str(uuid.uuid4()),
                    "child_id": child_id,
                    "chore_id": chore_id,
                    "chore_title": f"Match de ahorro ({match_pct:.0f}%)",
                    "amount": granted_match,
                    "status": "aprobado",
                    "family_id": current_user["family_id"],
                    "created_at": now,
                    "payment_type": "savings_match",
                    "purpose_note": None,
                    "quality_bonus": 0.0,
                    "chore_base_amount": 0.0,
                    "withdrawal_id": None,
                    "savings_allocated": None,
                    "savings_goal_id": split.savings_goal_id,
                    "match_source_savings": split.to_savings,
                }
                await db.payments.insert_one(match_payment)
                await create_notification(
                    current_user["family_id"],
                    "savings_match",
                    "¡Match de ahorro!",
                    f"Se otorgó match de {granted_match:.2f} por ahorro de tarea",
                    child_id,
                )

    await update_child_streak(child_id, current_user["family_id"])
    await update_goal_progress(child_id, current_user["family_id"])

    child = await db.children.find_one({"id": child_id})
    extra = f" (+{qbonus} bono calidad)" if qbonus else ""
    msg = f"La tarea '{chore['title']}' fue aprobada. {child['name']} ganó {total_pay}{extra}"
    if split.to_savings > 0:
        msg += f". {split.to_savings} a ahorro"
        if split.goal_title:
            msg += f" («{split.goal_title}»)"
    if floor_applied:
        msg += ". Se aplicó ahorro automático mínimo del perfil del hijo"
    await create_notification(
        current_user["family_id"],
        "task_approved",
        "¡Tarea aprobada!",
        msg,
        child_id,
    )
    if split.goal_just_completed and split.goal_title:
        await create_notification(
            current_user["family_id"],
            "savings_goal_completed",
            "¡Meta de ahorro alcanzada!",
            f"«{split.goal_title}»: objetivo completado con el pago de la tarea",
            child_id,
        )
    for m in split.milestones_crossed:
        if m == 100:
            continue
        await create_notification(
            current_user["family_id"],
            "savings_goal_milestone",
            f"¡Meta al {m}%!",
            f"«{split.goal_title or 'Meta de ahorro'}» alcanzó {m}% de avance",
            child_id,
        )

    updated = await db.chores.find_one({"id": chore_id})
    return _chore_to_response(updated)


@router.post("/{chore_id}/reject", response_model=ChoreResponse)
async def reject_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Rechazar una tarea completada"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    if chore["status"] != "completada":
        raise HTTPException(status_code=400, detail="Solo se pueden rechazar tareas completadas")

    await db.chores.update_one(
        {"id": chore_id},
        {"$set": {"status": "rechazada", "photo_url": None}},
    )

    updated = await db.chores.find_one({"id": chore_id})
    return _chore_to_response(updated)


async def _reverse_chore_approval_payment(
    chore_id: str,
    family_id: str,
    child_id: str,
    chore_doc: dict,
) -> None:
    """Devuelve el saldo y la meta de ahorro al estado previo al pago por aprobación."""
    cursor = db.payments.find(
        {
            "chore_id": chore_id,
            "family_id": family_id,
            "payment_type": "chore",
            "reversed_at": {"$exists": False},
        }
    ).sort("created_at", -1)
    payments = await cursor.to_list(1)
    pay = payments[0] if payments else None

    if not pay:
        # Datos anteriores a pagos por tarea: aproximar con la lógica actual de reparto
        qbonus = float(chore_doc.get("quality_bonus") or 0)
        total_pay = float(chore_doc["amount"]) + qbonus
        split = await preview_chore_savings_split(child_id, family_id, total_pay)
        if split.to_balance:
            await db.children.update_one({"id": child_id}, {"$inc": {"balance": -split.to_balance}})
        if split.to_savings > 0 and split.savings_goal_id:
            goal = await db.savings_goals.find_one(
                {"id": split.savings_goal_id, "family_id": family_id}
            )
            if goal:
                new_saved = max(0.0, round(float(goal.get("saved_amount", 0)) - split.to_savings, 2))
                target = float(goal["target_amount"])
                now_completed = new_saved >= target
                await db.savings_goals.update_one(
                    {"id": goal["id"]},
                    {"$set": {"saved_amount": new_saved, "is_completed": now_completed}},
                )
        return

    total_amt = float(pay["amount"])
    savings = float(pay.get("savings_allocated") or 0)
    to_balance = round(total_amt - savings, 2)

    if to_balance:
        await db.children.update_one({"id": child_id}, {"$inc": {"balance": -to_balance}})

    if savings > 0 and pay.get("savings_goal_id"):
        goal = await db.savings_goals.find_one(
            {"id": pay["savings_goal_id"], "family_id": family_id}
        )
        if goal:
            new_saved = max(0.0, round(float(goal.get("saved_amount", 0)) - savings, 2))
            target = float(goal["target_amount"])
            now_completed = new_saved >= target
            await db.savings_goals.update_one(
                {"id": goal["id"]},
                {"$set": {"saved_amount": new_saved, "is_completed": now_completed}},
            )

    await db.payments.update_one(
        {"id": pay["id"]},
        {"$set": {"reversed_at": datetime.utcnow()}},
    )


@router.post("/{chore_id}/reset", response_model=ChoreResponse)
async def reset_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Restablecer una tarea a pendiente. Si estaba aprobada, revierte el pago al hijo y la meta."""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")

    family_id = current_user["family_id"]
    if chore.get("status") == "aprobada":
        child_id = chore.get("completed_by")
        if child_id:
            await _reverse_chore_approval_payment(chore_id, family_id, child_id, chore)

    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "pendiente",
                "completed_by": None,
                "completed_at": None,
                "comment": None,
                "photo_url": None,
                "rating": None,
                "parent_feedback": None,
                "quality_bonus": 0.0,
            }
        },
    )

    updated = await db.chores.find_one({"id": chore_id})
    return _chore_to_response(updated)
