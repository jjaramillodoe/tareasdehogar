import secrets
import uuid
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import db
from app.deps import get_current_user
from app.models import (
    FamilyActivityRestoreRequest,
    FamilyCreate,
    FamilyPartialReset,
    FamilyResponse,
    FamilyUpdate,
)
from app.rate_limit import client_ip, enforce_rate_limit
from app.services.achievements import check_and_award_achievements
from app.services.audit import log_audit_event
from app.services.permissions import require_family_permission

router = APIRouter(prefix="/families", tags=["families"])


def _json_safe(value: Any):
    if isinstance(value, datetime):
        return value.isoformat()
    if isinstance(value, list):
        return [_json_safe(v) for v in value]
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k == "_id":
                continue
            out[k] = _json_safe(v)
        return out
    return value


def _restore_value(value: Any, key: str | None = None):
    if isinstance(value, dict):
        out = {}
        for k, v in value.items():
            if k == "_id":
                continue
            out[k] = _restore_value(v, k)
        return out
    if isinstance(value, list):
        return [_restore_value(v, key) for v in value]
    if isinstance(value, str) and key in {
        "created_at",
        "resolved_at",
        "start_date",
        "end_date",
        "earned_at",
        "completed_at",
        "scheduled_date",
        "expires_at",
        "used_at",
    }:
        raw = value[:-1] if value.endswith("Z") else value
        try:
            return datetime.fromisoformat(raw)
        except Exception:
            return value
    return value


@router.get("/public-by-code/{code}")
async def public_family_by_child_code(code: str, request: Request):
    """Sin autenticación: nombre de familia e hijos para elegir en la app del hijo."""
    enforce_rate_limit(f"public-code:{client_ip(request)}", limit=60, window_sec=900)
    raw = code.strip().upper()
    family = await db.families.find_one({"child_login_code": raw})
    if not family:
        raise HTTPException(status_code=404, detail="Código no encontrado")
    if not family.get("child_login_code"):
        new_code = secrets.token_hex(3).upper()
        await db.families.update_one({"id": family["id"]}, {"$set": {"child_login_code": new_code}})
        family["child_login_code"] = new_code
    children = await db.children.find({"family_id": family["id"]}).to_list(100)
    return {
        "family_name": family["name"],
        "currency": family["currency"],
        "children": [
            {"name": c["name"], "alias": c.get("alias"), "gender": c.get("gender")}
            for c in children
        ],
    }


@router.post("", response_model=FamilyResponse)
async def create_family(family_data: FamilyCreate, current_user: dict = Depends(get_current_user)):
    """Crear una nueva familia"""
    if current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Ya tienes una familia creada")

    family_id = str(uuid.uuid4())
    child_login_code = secrets.token_hex(3).upper()
    family = {
        "id": family_id,
        "name": family_data.name,
        "currency": family_data.currency,
        "country_code": family_data.country_code,
        "owner_id": current_user["id"],
        "created_at": datetime.utcnow(),
        "streak_bonus_amount": 0.0,
        "savings_match_percent": 0.0,
        "savings_match_weekly_cap": 0.0,
        "family_challenge_target_percent": 15.0,
        "child_login_code": child_login_code,
        "notifications_enabled_for_parents": True,
        "notifications_enabled_for_children": True,
        "notifications_quiet_hours_start": None,
        "notifications_quiet_hours_end": None,
        "min_withdrawal_amount": 0.0,
        "max_withdrawal_amount": 0.0,
        "max_daily_withdrawal_per_child": 0.0,
        "demo_mode_enabled": False,
        "auto_logout_minutes": 0,
        "permission_reset_activity_min_role": "owner",
        "permission_approve_withdrawals_min_role": "parent",
        "permission_edit_goals_min_role": "parent",
        "pin_failed_attempt_limit": 5,
        "pin_lockout_minutes": 15,
    }
    await db.families.insert_one(family)

    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"family_id": family_id, "family_role": "owner"}},
    )

    return FamilyResponse(**family)


@router.get("/my", response_model=FamilyResponse)
async def get_my_family(current_user: dict = Depends(get_current_user)):
    """Obtener la familia del usuario actual"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=404, detail="No tienes una familia. Crea una primero.")

    family = await db.families.find_one({"id": current_user["family_id"]})
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")

    if "streak_bonus_amount" not in family:
        family["streak_bonus_amount"] = 0.0
    if "savings_match_percent" not in family:
        family["savings_match_percent"] = 0.0
    if "savings_match_weekly_cap" not in family:
        family["savings_match_weekly_cap"] = 0.0
    if "family_challenge_target_percent" not in family:
        family["family_challenge_target_percent"] = 15.0
    if "notifications_enabled_for_parents" not in family:
        family["notifications_enabled_for_parents"] = True
    if "notifications_enabled_for_children" not in family:
        family["notifications_enabled_for_children"] = True
    if "notifications_quiet_hours_start" not in family:
        family["notifications_quiet_hours_start"] = None
    if "notifications_quiet_hours_end" not in family:
        family["notifications_quiet_hours_end"] = None
    if "min_withdrawal_amount" not in family:
        family["min_withdrawal_amount"] = 0.0
    if "max_withdrawal_amount" not in family:
        family["max_withdrawal_amount"] = 0.0
    if "max_daily_withdrawal_per_child" not in family:
        family["max_daily_withdrawal_per_child"] = 0.0
    if "demo_mode_enabled" not in family:
        family["demo_mode_enabled"] = False
    if "auto_logout_minutes" not in family:
        family["auto_logout_minutes"] = 0
    if "permission_reset_activity_min_role" not in family:
        family["permission_reset_activity_min_role"] = "owner"
    if "permission_approve_withdrawals_min_role" not in family:
        family["permission_approve_withdrawals_min_role"] = "parent"
    if "permission_edit_goals_min_role" not in family:
        family["permission_edit_goals_min_role"] = "parent"
    if "pin_failed_attempt_limit" not in family:
        family["pin_failed_attempt_limit"] = 5
    if "pin_lockout_minutes" not in family:
        family["pin_lockout_minutes"] = 15
    if not family.get("child_login_code"):
        new_code = secrets.token_hex(3).upper()
        await db.families.update_one({"id": family["id"]}, {"$set": {"child_login_code": new_code}})
        family["child_login_code"] = new_code
    return FamilyResponse(**family)


@router.put("/my", response_model=FamilyResponse)
async def update_my_family(family_data: FamilyUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar la familia del usuario"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=404, detail="No tienes una familia")

    update_data = {k: v for k, v in family_data.dict().items() if v is not None}
    if (
        "notifications_quiet_hours_start" in update_data
        and "notifications_quiet_hours_end" in update_data
        and update_data["notifications_quiet_hours_start"] == update_data["notifications_quiet_hours_end"]
    ):
        raise HTTPException(status_code=400, detail="Rango de horas silenciosas inválido")
    if update_data:
        await db.families.update_one({"id": current_user["family_id"]}, {"$set": update_data})
        await log_audit_event(
            family_id=current_user["family_id"],
            actor_user_id=current_user["id"],
            action="family_settings_updated",
            target_type="family",
            target_id=current_user["family_id"],
            metadata={"fields": sorted(update_data.keys())},
        )

    family = await db.families.find_one({"id": current_user["family_id"]})
    if family and "streak_bonus_amount" not in family:
        family["streak_bonus_amount"] = 0.0
    if family and "savings_match_percent" not in family:
        family["savings_match_percent"] = 0.0
    if family and "savings_match_weekly_cap" not in family:
        family["savings_match_weekly_cap"] = 0.0
    if family and "family_challenge_target_percent" not in family:
        family["family_challenge_target_percent"] = 15.0
    if family and "notifications_enabled_for_parents" not in family:
        family["notifications_enabled_for_parents"] = True
    if family and "notifications_enabled_for_children" not in family:
        family["notifications_enabled_for_children"] = True
    if family and "notifications_quiet_hours_start" not in family:
        family["notifications_quiet_hours_start"] = None
    if family and "notifications_quiet_hours_end" not in family:
        family["notifications_quiet_hours_end"] = None
    if family and "min_withdrawal_amount" not in family:
        family["min_withdrawal_amount"] = 0.0
    if family and "max_withdrawal_amount" not in family:
        family["max_withdrawal_amount"] = 0.0
    if family and "max_daily_withdrawal_per_child" not in family:
        family["max_daily_withdrawal_per_child"] = 0.0
    if family and "demo_mode_enabled" not in family:
        family["demo_mode_enabled"] = False
    if family and "auto_logout_minutes" not in family:
        family["auto_logout_minutes"] = 0
    if family and "permission_reset_activity_min_role" not in family:
        family["permission_reset_activity_min_role"] = "owner"
    if family and "permission_approve_withdrawals_min_role" not in family:
        family["permission_approve_withdrawals_min_role"] = "parent"
    if family and "permission_edit_goals_min_role" not in family:
        family["permission_edit_goals_min_role"] = "parent"
    if family and "pin_failed_attempt_limit" not in family:
        family["pin_failed_attempt_limit"] = 5
    if family and "pin_lockout_minutes" not in family:
        family["pin_lockout_minutes"] = 15
    if family and not family.get("child_login_code"):
        new_code = secrets.token_hex(3).upper()
        await db.families.update_one({"id": family["id"]}, {"$set": {"child_login_code": new_code}})
        family["child_login_code"] = new_code
    return FamilyResponse(**family)


@router.post("/invite")
async def create_family_invite(current_user: dict = Depends(get_current_user)):
    """Generar código para invitar a otro padre/tutor a la familia."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    family = await db.families.find_one({"id": current_user["family_id"]})
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")

    code = secrets.token_hex(4).upper()[:10]
    inv_id = str(uuid.uuid4())
    expires = datetime.utcnow() + timedelta(days=7)
    doc = {
        "id": inv_id,
        "code": code,
        "family_id": family["id"],
        "created_by": current_user["id"],
        "created_at": datetime.utcnow(),
        "expires_at": expires,
        "used": False,
    }
    await db.invites.insert_one(doc)
    return {"code": code, "expires_at": expires.isoformat() + "Z", "message": "Comparte el código con quien registrará su cuenta"}


@router.get("/members")
async def list_family_members(current_user: dict = Depends(get_current_user)):
    """Padres/tutores vinculados a la familia."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    family = await db.families.find_one({"id": current_user["family_id"]})
    owner_id = family["owner_id"] if family else None

    users = await db.users.find({"family_id": current_user["family_id"]}).to_list(50)
    out = []
    for u in users:
        role = u.get("family_role")
        if not role and owner_id:
            role = "owner" if u["id"] == owner_id else "parent"
        out.append(
            {
                "id": u["id"],
                "name": u["name"],
                "email": u["email"],
                "family_role": role or "parent",
                "created_at": u["created_at"].isoformat() if u.get("created_at") else None,
            }
        )
    return out


@router.post("/members/{user_id}/role")
async def update_member_role(user_id: str, role: str, current_user: dict = Depends(get_current_user)):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    family = await db.families.find_one({"id": current_user["family_id"]})
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    if family.get("owner_id") != current_user.get("id"):
        raise HTTPException(status_code=403, detail="Solo el owner puede cambiar roles")
    role = (role or "").strip().lower()
    if role not in {"admin", "parent"}:
        raise HTTPException(status_code=400, detail="Rol inválido (admin|parent)")
    target = await db.users.find_one({"id": user_id, "family_id": current_user["family_id"]})
    if not target:
        raise HTTPException(status_code=404, detail="Usuario no encontrado en la familia")
    if target["id"] == family["owner_id"]:
        raise HTTPException(status_code=400, detail="No puedes cambiar el rol del owner")
    await db.users.update_one({"id": user_id}, {"$set": {"family_role": role}})
    await log_audit_event(
        family_id=current_user["family_id"],
        actor_user_id=current_user["id"],
        action="member_role_updated",
        target_type="user",
        target_id=user_id,
        metadata={"new_role": role},
    )
    return {"ok": True, "user_id": user_id, "family_role": role}


@router.post("/reset-activity")
async def reset_family_activity(current_user: dict = Depends(get_current_user)):
    """
    Limpia datos de actividad de la familia (solo sesión padre/tutor):
    - tareas, pagos, metas, metas de ahorro, retiros, logros y alertas
    - historial de retos familiares
    - reinicia balances y rachas de hijos
    """
    family = await require_family_permission(current_user, "reset_activity", "owner")
    fid = family["id"]

    chores_res = await db.chores.delete_many({"family_id": fid})
    payments_res = await db.payments.delete_many({"family_id": fid})
    goals_res = await db.goals.delete_many({"family_id": fid})
    savings_goals_res = await db.savings_goals.delete_many({"family_id": fid})
    withdrawals_res = await db.withdrawals.delete_many({"family_id": fid})
    achievements_res = await db.achievements.delete_many({"family_id": fid})
    notifications_res = await db.notifications.delete_many({"family_id": fid})
    challenge_history_res = await db.family_challenge_history.delete_many({"family_id": fid})

    await db.children.update_many(
        {"family_id": fid},
        {
            "$set": {
                "balance": 0.0,
                "savings_current_streak": 0,
                "savings_best_streak": 0,
            }
        },
    )
    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="family_activity_reset_full",
        target_type="family",
        target_id=fid,
    )

    return {
        "ok": True,
        "deleted": {
            "chores": chores_res.deleted_count,
            "payments": payments_res.deleted_count,
            "goals": goals_res.deleted_count,
            "savings_goals": savings_goals_res.deleted_count,
            "withdrawals": withdrawals_res.deleted_count,
            "achievements": achievements_res.deleted_count,
            "notifications": notifications_res.deleted_count,
            "family_challenge_history": challenge_history_res.deleted_count,
        },
    }


@router.get("/activity-backup")
async def export_family_activity_backup(current_user: dict = Depends(get_current_user)):
    """Exporta un respaldo JSON de la actividad familiar (sin borrar datos)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    fid = current_user["family_id"]
    family = await db.families.find_one({"id": fid})
    children = await db.children.find({"family_id": fid}).to_list(500)
    chores = await db.chores.find({"family_id": fid}).to_list(5000)
    payments = await db.payments.find({"family_id": fid}).to_list(10000)
    goals = await db.goals.find({"family_id": fid}).to_list(2000)
    savings_goals = await db.savings_goals.find({"family_id": fid}).to_list(2000)
    withdrawals = await db.withdrawals.find({"family_id": fid}).to_list(5000)
    achievements = await db.achievements.find({"family_id": fid}).to_list(5000)
    notifications = await db.notifications.find({"family_id": fid}).to_list(10000)
    family_challenge_history = await db.family_challenge_history.find({"family_id": fid}).to_list(1000)

    backup = {
        "exported_at": datetime.utcnow().isoformat(),
        "family_id": fid,
        "family": _json_safe(family) if family else None,
        "children": _json_safe(children),
        "activity": {
            "chores": _json_safe(chores),
            "payments": _json_safe(payments),
            "goals": _json_safe(goals),
            "savings_goals": _json_safe(savings_goals),
            "withdrawals": _json_safe(withdrawals),
            "achievements": _json_safe(achievements),
            "notifications": _json_safe(notifications),
            "family_challenge_history": _json_safe(family_challenge_history),
        },
        "counts": {
            "children": len(children),
            "chores": len(chores),
            "payments": len(payments),
            "goals": len(goals),
            "savings_goals": len(savings_goals),
            "withdrawals": len(withdrawals),
            "achievements": len(achievements),
            "notifications": len(notifications),
            "family_challenge_history": len(family_challenge_history),
        },
    }
    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="family_activity_backup_exported",
        target_type="family",
        target_id=fid,
        metadata={"counts": backup["counts"]},
    )
    return backup


@router.post("/reset-activity/partial")
async def reset_family_activity_partial(
    data: FamilyPartialReset,
    current_user: dict = Depends(get_current_user),
):
    family = await require_family_permission(current_user, "reset_activity", "owner")
    fid = family["id"]
    deleted: dict[str, int] = {}
    if data.chores:
        deleted["chores"] = (await db.chores.delete_many({"family_id": fid})).deleted_count
    if data.goals:
        deleted["goals"] = (await db.goals.delete_many({"family_id": fid})).deleted_count
    if data.savings_goals:
        deleted["savings_goals"] = (await db.savings_goals.delete_many({"family_id": fid})).deleted_count
    if data.payments:
        deleted["payments"] = (await db.payments.delete_many({"family_id": fid})).deleted_count
    if data.withdrawals:
        deleted["withdrawals"] = (await db.withdrawals.delete_many({"family_id": fid})).deleted_count
    if data.achievements:
        deleted["achievements"] = (await db.achievements.delete_many({"family_id": fid})).deleted_count
    if data.notifications:
        deleted["notifications"] = (await db.notifications.delete_many({"family_id": fid})).deleted_count
    if data.family_challenge_history:
        deleted["family_challenge_history"] = (
            await db.family_challenge_history.delete_many({"family_id": fid})
        ).deleted_count
    if data.reset_children_balance_and_streaks:
        await db.children.update_many(
            {"family_id": fid},
            {"$set": {"balance": 0.0, "savings_current_streak": 0, "savings_best_streak": 0}},
        )
    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="family_activity_reset_partial",
        target_type="family",
        target_id=fid,
        metadata=data.model_dump(),
    )
    return {"ok": True, "deleted": deleted}


@router.get("/audit-log")
async def get_audit_log(limit: int = 50, current_user: dict = Depends(get_current_user)):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    limit = max(1, min(200, int(limit)))
    rows = await db.audit_logs.find({"family_id": current_user["family_id"]}).sort("created_at", -1).to_list(limit)
    return [_json_safe(r) for r in rows]


@router.post("/demo/clear")
async def clear_demo_data(current_user: dict = Depends(get_current_user)):
    family = await require_family_permission(current_user, "reset_activity", "owner")
    fid = family["id"]
    deleted = {}
    for name in (
        "chores",
        "payments",
        "goals",
        "savings_goals",
        "withdrawals",
        "notifications",
        "achievements",
        "family_challenge_history",
    ):
        res = await getattr(db, name).delete_many({"family_id": fid})
        deleted[name] = res.deleted_count
    await db.children.update_many(
        {"family_id": fid},
        {"$set": {"balance": 0.0, "savings_current_streak": 0, "savings_best_streak": 0}},
    )
    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="demo_data_cleared",
        target_type="family",
        target_id=fid,
    )
    return {"ok": True, "deleted": deleted}


def _demo_seed_window(now: datetime) -> tuple[datetime, datetime, datetime, datetime]:
    """History for reports + calendar feed from 13 Aug 2026 onward."""
    hist_end = now.replace(microsecond=0)
    hist_start = datetime(now.year, 8, 12)
    if hist_end < hist_start:
        hist_start = datetime(now.year - 1, 8, 12)
    if (hist_end.date() - hist_start.date()).days < 14:
        hist_start = (hist_end - timedelta(days=45)).replace(hour=0, minute=0, second=0, microsecond=0)

    cal_start = datetime(2026, 8, 13)
    cal_end = datetime(2026, 10, 31, 23, 59, 59)
    return hist_start, hist_end, cal_start, cal_end


_CHORE_CATALOG = (
    ("Tender la cama", "Tender y acomodar la cama al despertar"),
    ("Ordenar el cuarto", "Recoger ropa y juguetes del piso"),
    ("Poner la mesa", "Platos, vasos y cubiertos para la comida"),
    ("Lavar los platos", "Lavar y dejar secar lo de la cena"),
    ("Sacar la basura", "Bolsas al contenedor y bolsas nuevas"),
    ("Ayudar con la compra", "Guardar lo que se compró en su lugar"),
    ("Regar las plantas", "Agua a las macetas del patio y la sala"),
    ("Barrer el patio", "Barrer hojas y polvo del patio"),
    ("Organizar la mochila", "Cuadernos, estuche y lonchera listos"),
    ("Doblar la ropa", "Doblar y guardar la ropa limpia"),
    ("Ordenar juguetes", "Todos los juguetes a su caja o estante"),
    ("Limpiar el baño chico", "Lavabo y espejo con el paño"),
    ("Dar de comer a la mascota", "Agua y comida a la hora acordada"),
    ("Preparar el desayuno", "Ayudar a servir cereal o fruta"),
    ("Recoger el comedor", "Limpiar migas y empujar las sillas"),
)


def _catalog_item(day: datetime, child_idx: int, t: int) -> tuple[str, str]:
    return _CHORE_CATALOG[(day.toordinal() + child_idx + t) % len(_CHORE_CATALOG)]


def _tasks_for_day(day: datetime, child_idx: int, *, dense: bool) -> int:
    weekday = day.weekday()
    seed_n = (day.toordinal() * 17 + child_idx * 31) % 100
    if dense:
        if weekday >= 5:
            return 2
        return 3
    if weekday >= 5:
        return 1 if seed_n < (55 - child_idx * 12) else 0
    if seed_n < (12 + child_idx * 8):
        return 0
    if seed_n < 55:
        return 1
    if seed_n < 85:
        return 2
    return 3


_DEMO_SAVINGS_TITLES = (
    "Bicicleta nueva",
    "Juego de mesa",
    "Auriculares",
    "Libros favoritos",
    "Salida al cine",
)


@router.post("/demo/seed")
async def seed_demo_data(current_user: dict = Depends(get_current_user)):
    """Seed realistic activity: approved history for reports + dated chores for Calendario."""
    family = await require_family_permission(current_user, "reset_activity", "owner")
    fid = family["id"]
    children = await db.children.find({"family_id": fid}).to_list(200)
    if not children:
        raise HTTPException(status_code=400, detail="No hay hijos para generar demo")

    now = datetime.utcnow()
    hist_start, hist_end, cal_start, cal_end = _demo_seed_window(now)
    created = {
        "chores": 0,
        "payments": 0,
        "notifications": 0,
        "savings_goals": 0,
        "goals": 0,
        "achievements": 0,
        "from": hist_start.date().isoformat(),
        "to": cal_end.date().isoformat(),
        "calendar_from": cal_start.date().isoformat(),
        "calendar_to": cal_end.date().isoformat(),
    }

    chores_batch: list[dict] = []
    payments_batch: list[dict] = []
    notifs_batch: list[dict] = []
    savings_batch: list[dict] = []
    goals_batch: list[dict] = []
    child_stats: dict[str, dict] = {}

    for child_idx, ch in enumerate(children):
        cid = ch["id"]
        name = ch.get("name") or "Hijo"
        earned = 0.0
        last_task_date = None
        best_streak = 0
        running_streak = 0
        day = hist_start.replace(hour=12, minute=0, second=0, microsecond=0)
        end_day = hist_end.replace(hour=12, minute=0, second=0, microsecond=0)

        while day <= end_day:
            tasks_today = _tasks_for_day(day, child_idx, dense=False)

            if tasks_today > 0:
                running_streak += 1
                best_streak = max(best_streak, running_streak)
                last_task_date = day
            else:
                running_streak = 0

            for t in range(tasks_today):
                title_base, desc = _catalog_item(day, child_idx, t)
                amount = round(1.5 + ((day.toordinal() + child_idx + t) % 4) * 0.5, 2)
                chore_id = str(uuid.uuid4())
                completed_at = day.replace(hour=16 + t, minute=(child_idx * 7 + t * 11) % 50)
                if completed_at > now:
                    completed_at = now - timedelta(minutes=30 + t)
                scheduled = day.replace(hour=12, minute=0, second=0, microsecond=0)
                chores_batch.append(
                    {
                        "id": chore_id,
                        "title": title_base,
                        "description": desc,
                        "amount": amount,
                        "frequency": "unica",
                        "assigned_to": [cid],
                        "status": "aprobada",
                        "completed_by": cid,
                        "completed_at": completed_at,
                        "comment": "Listo",
                        "family_id": fid,
                        "created_at": completed_at - timedelta(hours=2),
                        "scheduled_date": scheduled,
                        "is_demo": True,
                    }
                )
                payments_batch.append(
                    {
                        "id": str(uuid.uuid4()),
                        "child_id": cid,
                        "chore_id": chore_id,
                        "chore_title": title_base,
                        "amount": amount,
                        "status": "aprobado",
                        "family_id": fid,
                        "created_at": completed_at,
                        "payment_type": "chore",
                        "is_demo": True,
                    }
                )
                earned += amount
                created["chores"] += 1
                created["payments"] += 1

            day += timedelta(days=1)

        # Calendar feed: 13 Aug 2026 → 31 Oct 2026 (pending, dated).
        # Skip days already covered by approved history so lists/calendar don't duplicate.
        cal_loop = max(cal_start.date(), (hist_end + timedelta(days=1)).date())
        cal_day = datetime(cal_loop.year, cal_loop.month, cal_loop.day, 12, 0, 0)
        cal_last = cal_end.replace(hour=12, minute=0, second=0, microsecond=0)
        while cal_day <= cal_last:
            tasks_today = _tasks_for_day(cal_day, child_idx, dense=True)
            for t in range(tasks_today):
                title_base, desc = _catalog_item(cal_day, child_idx, t)
                amount = round(1.5 + ((cal_day.toordinal() + child_idx + t) % 4) * 0.5, 2)
                scheduled = cal_day.replace(hour=12, minute=0, second=0, microsecond=0)
                chores_batch.append(
                    {
                        "id": str(uuid.uuid4()),
                        "title": title_base,
                        "description": desc,
                        "amount": amount,
                        "frequency": "unica",
                        "assigned_to": [cid],
                        "status": "pendiente",
                        "completed_by": None,
                        "completed_at": None,
                        "comment": None,
                        "family_id": fid,
                        "created_at": now,
                        "scheduled_date": scheduled,
                        "is_demo": True,
                    }
                )
                created["chores"] += 1
            cal_day += timedelta(days=1)

        # Live items for home / review (today).
        today_sched = now.replace(hour=12, minute=0, second=0, microsecond=0)
        for status, title, desc, amt in (
            ("completada", "Ayudar en la cocina", "Lavar verduras o revolver la olla", 2.0),
            ("pendiente", "Ordenar juguetes", "Todos los juguetes a su caja o estante", 1.5),
        ):
            chores_batch.append(
                {
                    "id": str(uuid.uuid4()),
                    "title": title,
                    "description": desc,
                    "amount": amt,
                    "frequency": "unica",
                    "assigned_to": [cid],
                    "status": status,
                    "completed_by": cid if status == "completada" else None,
                    "completed_at": now if status == "completada" else None,
                    "comment": "Para revisar" if status == "completada" else None,
                    "family_id": fid,
                    "created_at": now - timedelta(hours=3 + child_idx),
                    "scheduled_date": today_sched,
                    "is_demo": True,
                }
            )
            created["chores"] += 1

        # Task goals: 1 completed + 1 in progress (+ 1 completed for first child → goals_3 path).
        completed_goal_defs = [
            ("Semana de ayuda", 10, 5.0, True, 10),
            ("Reto de 5 tareas", 5, 3.0, True, 5),
        ]
        if child_idx == 0:
            completed_goal_defs.append(("Meta sorpresa", 8, 4.0, True, 8))
        for title, target, bonus, done, done_count in completed_goal_defs:
            goals_batch.append(
                {
                    "id": str(uuid.uuid4()),
                    "title": f"{title} — {name}",
                    "description": "Completa las tareas del reto para el bono",
                    "target_tasks": target,
                    "bonus_amount": bonus,
                    "child_id": cid,
                    "completed_tasks": done_count if done else max(1, target // 2),
                    "is_completed": done,
                    "bonus_paid": done,
                    "start_date": hist_start,
                    "end_date": hist_end,
                    "family_id": fid,
                    "created_at": hist_start + timedelta(days=2),
                    "goal_period": "personalizado",
                    "is_demo": True,
                }
            )
            created["goals"] += 1
            if done:
                earned += bonus
                payments_batch.append(
                    {
                        "id": str(uuid.uuid4()),
                        "child_id": cid,
                        "chore_id": "",
                        "chore_title": f"Bono meta: {title}",
                        "amount": bonus,
                        "status": "aprobado",
                        "family_id": fid,
                        "created_at": hist_end - timedelta(days=3 + child_idx),
                        "payment_type": "goal_bonus",
                        "is_demo": True,
                    }
                )
                created["payments"] += 1

        goals_batch.append(
            {
                "id": str(uuid.uuid4()),
                "title": f"Meta de la semana — {name}",
                "description": "Sigue sumando tareas esta semana",
                "target_tasks": 12,
                "bonus_amount": 6.0,
                "child_id": cid,
                "completed_tasks": 4 + (child_idx % 3),
                "is_completed": False,
                "bonus_paid": False,
                "start_date": hist_end - timedelta(days=6),
                "end_date": hist_end + timedelta(days=7),
                "family_id": fid,
                "created_at": hist_end - timedelta(days=6),
                "goal_period": "semanal",
                "is_demo": True,
            }
        )
        created["goals"] += 1

        # Savings goals: one active with progress + one completed.
        active_target = 40.0 + child_idx * 15.0
        active_saved = round(active_target * (0.45 + (child_idx % 3) * 0.12), 2)
        active_milestones = [m for m in (25, 50, 75, 100) if (active_saved / active_target) * 100 >= m]
        savings_title = _DEMO_SAVINGS_TITLES[child_idx % len(_DEMO_SAVINGS_TITLES)]
        savings_batch.append(
            {
                "id": str(uuid.uuid4()),
                "title": f"{savings_title}",
                "note": "Ahorro para un objetivo personal",
                "target_amount": active_target,
                "saved_amount": active_saved,
                "child_id": cid,
                "family_id": fid,
                "created_at": hist_start,
                "is_completed": False,
                "status": "active",
                "proposed_by_child": False,
                "milestones_reached": active_milestones,
                "last_milestone_reached": active_milestones[-1] if active_milestones else None,
                "is_demo": True,
            }
        )
        created["savings_goals"] += 1

        done_target = 15.0 + child_idx * 5.0
        savings_batch.append(
            {
                "id": str(uuid.uuid4()),
                "title": "Snack especial",
                "note": "Meta de ahorro ya cumplida",
                "target_amount": done_target,
                "saved_amount": done_target,
                "child_id": cid,
                "family_id": fid,
                "created_at": hist_start - timedelta(days=10),
                "is_completed": True,
                "status": "active",
                "proposed_by_child": child_idx % 2 == 1,
                "milestones_reached": [25, 50, 75, 100],
                "last_milestone_reached": 100,
                "is_demo": True,
            }
        )
        created["savings_goals"] += 1

        # Liquid balance = earned − saved into active goal (completed goal already “spent” narratively).
        liquid = round(max(0.0, earned - active_saved), 2)
        savings_weeks = 4 + child_idx
        child_stats[cid] = {
            "balance": liquid,
            "current_streak": max(running_streak, 1 if earned > 0 else 0),
            "best_streak": max(best_streak, running_streak, 1 if earned > 0 else 0),
            "last_task_date": last_task_date or now,
            "savings_current_streak": savings_weeks,
            "savings_best_streak": max(savings_weeks, 6),
            "last_savings_date": hist_end - timedelta(days=2),
            "savings_on_approve_percent": 20.0,
        }

        notifs_batch.append(
            {
                "id": str(uuid.uuid4()),
                "type": "demo_seed",
                "title": "Actividad de ejemplo lista",
                "message": (
                    f"Historial {created['from']} y calendario {created['calendar_from']} → {created['calendar_to']} "
                    f"para {name} (≈ {round(earned, 2)} ganados · ahorro {active_saved:.0f}/{active_target:.0f})"
                ),
                "child_id": cid,
                "is_read": False,
                "family_id": fid,
                "created_at": now,
                "is_demo": True,
            }
        )
        created["notifications"] += 1

    if chores_batch:
        await db.chores.insert_many(chores_batch)
    if payments_batch:
        await db.payments.insert_many(payments_batch)
    if savings_batch:
        await db.savings_goals.insert_many(savings_batch)
    if goals_batch:
        await db.goals.insert_many(goals_batch)
    if notifs_batch:
        await db.notifications.insert_many(notifs_batch)

    for cid, stats in child_stats.items():
        await db.children.update_one({"id": cid}, {"$set": stats})
        before = await db.achievements.count_documents({"child_id": cid})
        await check_and_award_achievements(cid, fid)
        after = await db.achievements.count_documents({"child_id": cid})
        created["achievements"] += max(0, after - before)

    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="demo_data_seeded",
        target_type="family",
        target_id=fid,
        metadata=created,
    )
    return {"ok": True, "created": created}


@router.get("/diagnostics")
async def get_family_diagnostics(current_user: dict = Depends(get_current_user)):
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    fid = current_user["family_id"]
    last_backup = await db.audit_logs.find_one(
        {"family_id": fid, "action": "family_activity_backup_exported"},
        sort=[("created_at", -1)],
    )
    return {
        "server_time": datetime.utcnow().isoformat(),
        "api_status": "ok",
        "db_status": "ok",
        "family_id": fid,
        "last_backup_at": last_backup.get("created_at").isoformat() if last_backup else None,
    }


@router.post("/activity-restore")
async def restore_family_activity(
    data: FamilyActivityRestoreRequest,
    current_user: dict = Depends(get_current_user),
):
    family = await require_family_permission(current_user, "reset_activity", "owner")
    fid = family["id"]
    backup = data.backup or {}
    backup_fid = backup.get("family_id")
    family_matches = backup_fid == fid

    activity = backup.get("activity") or {}
    collections = {
        "chores": db.chores,
        "payments": db.payments,
        "goals": db.goals,
        "savings_goals": db.savings_goals,
        "withdrawals": db.withdrawals,
        "achievements": db.achievements,
        "notifications": db.notifications,
        "family_challenge_history": db.family_challenge_history,
    }

    backup_counts: dict[str, int] = {}
    current_counts: dict[str, int] = {}
    for name, col in collections.items():
        backup_counts[name] = len(activity.get(name) or [])
        current_counts[name] = await col.count_documents({"family_id": fid})

    preview = {
        "ok": True,
        "applied": False,
        "family_matches": family_matches,
        "backup_family_id": backup_fid,
        "current_family_id": fid,
        "backup_counts": backup_counts,
        "current_counts": current_counts,
    }
    if not data.apply:
        return preview

    if not family_matches:
        raise HTTPException(status_code=400, detail="El respaldo no pertenece a esta familia")

    inserted: dict[str, int] = {}
    for name, col in collections.items():
        await col.delete_many({"family_id": fid})
        rows = activity.get(name) or []
        docs = []
        for r in rows:
            doc = _restore_value(r)
            if isinstance(doc, dict):
                doc["family_id"] = fid
                docs.append(doc)
        if docs:
            await col.insert_many(docs)
        inserted[name] = len(docs)

    # Restaurar balance/rachas de hijos existentes en esta familia.
    for ch in backup.get("children") or []:
        cid = ch.get("id")
        if not cid:
            continue
        await db.children.update_one(
            {"id": cid, "family_id": fid},
            {
                "$set": {
                    "balance": float(ch.get("balance", 0.0)),
                    "savings_current_streak": int(ch.get("savings_current_streak", 0)),
                    "savings_best_streak": int(ch.get("savings_best_streak", 0)),
                }
            },
        )

    await log_audit_event(
        family_id=fid,
        actor_user_id=current_user["id"],
        action="family_activity_restore_applied",
        target_type="family",
        target_id=fid,
        metadata={"inserted": inserted},
    )
    return {
        "ok": True,
        "applied": True,
        "family_matches": True,
        "backup_family_id": backup_fid,
        "current_family_id": fid,
        "inserted_counts": inserted,
    }
