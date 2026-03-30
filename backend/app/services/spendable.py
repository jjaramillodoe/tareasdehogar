from datetime import datetime, timedelta

from app.config import db


async def get_cooldown_locked_amount(child_id: str, family_id: str) -> float:
    """Suma de ingresos recientes aún en cooldown (<24h) que sí fueron al saldo disponible.

    Regla: si una parte del pago fue enviada a ahorro (savings_allocated), esa parte no entra en cooldown.
    """
    since = datetime.utcnow() - timedelta(hours=24)
    recent = await db.payments.find(
        {
            "child_id": child_id,
            "family_id": family_id,
            "reversed_at": {"$exists": False},
            "created_at": {"$gte": since},
        }
    ).to_list(1000)

    locked = 0.0
    for p in recent:
        ptype = p.get("payment_type", "chore")
        if ptype == "withdrawal":
            continue
        amount = float(p.get("amount") or 0)
        savings_allocated = float(p.get("savings_allocated") or 0)
        to_balance = round(max(0.0, amount - savings_allocated), 2)
        locked += to_balance
    return round(max(0.0, locked), 2)

