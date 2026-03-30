import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Body, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.models import (
    WithdrawalBulkApproveSmall,
    WithdrawalCreate,
    WithdrawalResolve,
    WithdrawalResponse,
)
from app.services.audit import log_audit_event
from app.services.notifications import create_notification
from app.services.permissions import require_family_permission
from app.services.spendable import get_cooldown_locked_amount

router = APIRouter(prefix="/withdrawals", tags=["withdrawals"])


def _to_response(doc: dict) -> WithdrawalResponse:
    return WithdrawalResponse(
        id=doc["id"],
        child_id=doc["child_id"],
        amount=float(doc["amount"]),
        status=doc["status"],
        note=doc.get("note"),
        purpose_type=doc.get("purpose_type"),
        goal_impact_note=doc.get("goal_impact_note"),
        parent_note=doc.get("parent_note"),
        family_id=doc["family_id"],
        created_at=doc["created_at"],
        resolved_at=doc.get("resolved_at"),
    )


@router.post("/request", response_model=WithdrawalResponse)
async def request_withdrawal(data: WithdrawalCreate, current_user: dict = Depends(get_current_user_or_child)):
    """Un hijo solicita retirar parte de su saldo (padre debe aprobar)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    if current_user.get("is_child_session") and data.child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")

    child = await db.children.find_one(
        {"id": data.child_id, "family_id": current_user["family_id"]}
    )
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    if data.amount <= 0:
        raise HTTPException(status_code=400, detail="El monto debe ser mayor a 0")

    family = await db.families.find_one({"id": current_user["family_id"]})
    min_w = float((family or {}).get("min_withdrawal_amount") or 0.0)
    max_w = float((family or {}).get("max_withdrawal_amount") or 0.0)
    max_daily = float((family or {}).get("max_daily_withdrawal_per_child") or 0.0)
    if min_w > 0 and float(data.amount) < min_w:
        raise HTTPException(status_code=400, detail=f"Retiro mínimo permitido: {min_w:.2f}")
    if max_w > 0 and float(data.amount) > max_w:
        raise HTTPException(status_code=400, detail=f"Retiro máximo permitido: {max_w:.2f}")
    if max_daily > 0:
        day_prefix = datetime.utcnow().date().isoformat()
        today_rows = await db.withdrawals.find(
            {
                "family_id": current_user["family_id"],
                "child_id": data.child_id,
                "status": {"$in": ["pending", "approved"]},
                "created_at": {
                    "$gte": datetime.fromisoformat(day_prefix + "T00:00:00"),
                    "$lt": datetime.fromisoformat(day_prefix + "T23:59:59"),
                },
            }
        ).to_list(1000)
        today_total = sum(float(r.get("amount", 0)) for r in today_rows)
        if today_total + float(data.amount) > max_daily:
            raise HTTPException(
                status_code=400,
                detail=f"Límite diario por hijo excedido ({max_daily:.2f})",
            )

    balance = float(child.get("balance", 0))
    locked = await get_cooldown_locked_amount(data.child_id, current_user["family_id"])
    available_now = round(max(0.0, balance - locked), 2)
    if data.amount > available_now:
        raise HTTPException(
            status_code=400,
            detail=f"Saldo disponible insuficiente. Disponible ahora: {available_now:.2f} (resto en cooldown 24h)",
        )

    wid = str(uuid.uuid4())
    doc = {
        "id": wid,
        "child_id": data.child_id,
        "family_id": current_user["family_id"],
        "amount": float(data.amount),
        "status": "pending",
        "note": data.note,
        "purpose_type": data.purpose_type,
        "goal_impact_note": data.goal_impact_note,
        "parent_note": None,
        "created_at": datetime.utcnow(),
        "resolved_at": None,
    }
    await db.withdrawals.insert_one(doc)

    await create_notification(
        current_user["family_id"],
        "withdrawal_request",
        "Solicitud de retiro",
        f"{child['name']} solicitó retirar {data.amount}"
        + (f" ({data.purpose_type})" if data.purpose_type else ""),
        data.child_id,
    )
    await log_audit_event(
        family_id=current_user["family_id"],
        actor_user_id=current_user.get("id"),
        actor_child_id=current_user.get("child_id"),
        action="withdrawal_requested",
        target_type="withdrawal",
        target_id=wid,
        metadata={"amount": float(data.amount), "child_id": data.child_id},
    )

    return _to_response(doc)


@router.get("", response_model=List[WithdrawalResponse])
async def list_withdrawals(
    status: Optional[str] = None,
    current_user: dict = Depends(get_current_user_or_child),
):
    """Listar solicitudes de retiro de la familia."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    q: dict = {"family_id": current_user["family_id"]}
    if status:
        q["status"] = status
    if current_user.get("is_child_session"):
        q["child_id"] = current_user["child_id"]

    rows = await db.withdrawals.find(q).sort("created_at", -1).to_list(500)
    return [_to_response(r) for r in rows]


@router.post("/{withdrawal_id}/approve", response_model=WithdrawalResponse)
async def approve_withdrawal(
    withdrawal_id: str,
    data: Optional[WithdrawalResolve] = Body(None),
    current_user: dict = Depends(get_current_user),
):
    await require_family_permission(current_user, "approve_withdrawals", "parent")
    if data is None:
        data = WithdrawalResolve()
    """Aprobar retiro: descuenta saldo y registra pago tipo retiro."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    w = await db.withdrawals.find_one(
        {"id": withdrawal_id, "family_id": current_user["family_id"], "status": "pending"}
    )
    if not w:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    child = await db.children.find_one({"id": w["child_id"]})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    amt = float(w["amount"])
    if float(child.get("balance", 0)) < amt:
        raise HTTPException(status_code=400, detail="Saldo insuficiente")

    await db.children.update_one({"id": w["child_id"]}, {"$inc": {"balance": -amt}})

    payment = {
        "id": str(uuid.uuid4()),
        "child_id": w["child_id"],
        "chore_id": withdrawal_id,
        "chore_title": "Retiro de saldo",
        "amount": amt,
        "status": "aprobado",
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
        "payment_type": "withdrawal",
        "purpose_note": data.parent_note,
        "quality_bonus": 0.0,
        "withdrawal_id": withdrawal_id,
    }
    await db.payments.insert_one(payment)

    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {
            "$set": {
                "status": "approved",
                "resolved_at": datetime.utcnow(),
                "parent_note": data.parent_note,
            }
        },
    )

    updated = await db.withdrawals.find_one({"id": withdrawal_id})
    await log_audit_event(
        family_id=current_user["family_id"],
        actor_user_id=current_user["id"],
        action="withdrawal_approved",
        target_type="withdrawal",
        target_id=withdrawal_id,
        metadata={"amount": amt},
    )
    return _to_response(updated)


@router.post("/{withdrawal_id}/reject", response_model=WithdrawalResponse)
async def reject_withdrawal(withdrawal_id: str, current_user: dict = Depends(get_current_user)):
    await require_family_permission(current_user, "approve_withdrawals", "parent")
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    w = await db.withdrawals.find_one(
        {"id": withdrawal_id, "family_id": current_user["family_id"], "status": "pending"}
    )
    if not w:
        raise HTTPException(status_code=404, detail="Solicitud no encontrada")

    await db.withdrawals.update_one(
        {"id": withdrawal_id},
        {"$set": {"status": "rejected", "resolved_at": datetime.utcnow()}},
    )
    updated = await db.withdrawals.find_one({"id": withdrawal_id})
    await log_audit_event(
        family_id=current_user["family_id"],
        actor_user_id=current_user["id"],
        action="withdrawal_rejected",
        target_type="withdrawal",
        target_id=withdrawal_id,
    )
    return _to_response(updated)


@router.post("/approve-small/bulk")
async def bulk_approve_small_withdrawals(
    data: WithdrawalBulkApproveSmall,
    current_user: dict = Depends(get_current_user),
):
    await require_family_permission(current_user, "approve_withdrawals", "parent")
    """Aprueba en lote solicitudes pendientes con monto <= max_amount."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    pending = await db.withdrawals.find(
        {
            "family_id": current_user["family_id"],
            "status": "pending",
            "amount": {"$lte": float(data.max_amount)},
        }
    ).to_list(1000)

    approved_count = 0
    skipped_count = 0
    total_amount = 0.0

    for w in pending:
        child = await db.children.find_one({"id": w["child_id"]})
        if not child:
            skipped_count += 1
            continue

        amt = float(w.get("amount", 0))
        if float(child.get("balance", 0)) < amt:
            skipped_count += 1
            continue

        await db.children.update_one({"id": w["child_id"]}, {"$inc": {"balance": -amt}})

        payment = {
            "id": str(uuid.uuid4()),
            "child_id": w["child_id"],
            "chore_id": w["id"],
            "chore_title": "Retiro de saldo",
            "amount": amt,
            "status": "aprobado",
            "family_id": current_user["family_id"],
            "created_at": datetime.utcnow(),
            "payment_type": "withdrawal",
            "purpose_note": data.parent_note,
            "quality_bonus": 0.0,
            "withdrawal_id": w["id"],
        }
        await db.payments.insert_one(payment)

        await db.withdrawals.update_one(
            {"id": w["id"]},
            {
                "$set": {
                    "status": "approved",
                    "resolved_at": datetime.utcnow(),
                    "parent_note": data.parent_note,
                }
            },
        )
        approved_count += 1
        total_amount += amt

    return {
        "approved_count": approved_count,
        "skipped_count": skipped_count,
        "total_amount": round(total_amount, 2),
    }
