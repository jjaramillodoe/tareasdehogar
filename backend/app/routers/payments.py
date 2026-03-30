from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child
from app.models import PaymentPurposeUpdate, PaymentResponse

router = APIRouter(prefix="/payments", tags=["payments"])


def _payment_to_response(p: dict) -> PaymentResponse:
    sa = p.get("savings_allocated")
    return PaymentResponse(
        id=p["id"],
        child_id=p["child_id"],
        chore_id=p.get("chore_id") or "",
        chore_title=p.get("chore_title") or "",
        amount=float(p["amount"]),
        status=p.get("status", "aprobado"),
        created_at=p["created_at"],
        payment_type=p.get("payment_type", "chore"),
        purpose_note=p.get("purpose_note"),
        quality_bonus=float(p.get("quality_bonus") or 0),
        withdrawal_id=p.get("withdrawal_id"),
        savings_allocated=float(sa) if sa is not None else None,
        savings_goal_id=p.get("savings_goal_id"),
        savings_reason_note=p.get("savings_reason_note"),
    )


@router.get("", response_model=List[PaymentResponse])
async def get_payments(current_user: dict = Depends(get_current_user)):
    """Obtener todos los pagos y movimientos de la familia."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    payments = await db.payments.find(
        {"family_id": current_user["family_id"], "reversed_at": {"$exists": False}}
    ).sort("created_at", -1).to_list(1000)
    return [_payment_to_response(p) for p in payments]


@router.get("/child/{child_id}", response_model=List[PaymentResponse])
async def get_child_payments(child_id: str, current_user: dict = Depends(get_current_user_or_child)):
    """Historial de pagos de un hijo."""
    if current_user.get("is_child_session") and child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    payments = await db.payments.find(
        {"child_id": child_id, "family_id": current_user["family_id"], "reversed_at": {"$exists": False}}
    ).sort("created_at", -1).to_list(1000)

    return [_payment_to_response(p) for p in payments]


@router.patch("/{payment_id}/purpose", response_model=PaymentResponse)
async def update_payment_purpose(
    payment_id: str,
    data: PaymentPurposeUpdate,
    current_user: dict = Depends(get_current_user),
):
    """Actualizar nota de para qué usaron el dinero (hijo o padre)."""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    p = await db.payments.find_one({"id": payment_id, "family_id": current_user["family_id"]})
    if not p:
        raise HTTPException(status_code=404, detail="Movimiento no encontrado")

    await db.payments.update_one({"id": payment_id}, {"$set": {"purpose_note": data.purpose_note}})
    updated = await db.payments.find_one({"id": payment_id})
    return _payment_to_response(updated)
