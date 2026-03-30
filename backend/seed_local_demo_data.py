#!/usr/bin/env python3
"""
Seed local demo data for HabitApp without removing users/children.

What it does:
- Keeps users, families, and children documents intact.
- Optionally cleans family-scoped activity collections.
- Inserts realistic chores, payments, withdrawals, savings goals, achievements, and notifications.
- Updates children balances/streak fields based on seeded data.

Usage:
  python backend/seed_local_demo_data.py --clean
"""

import argparse
import asyncio
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Dict, List

from app.config import db
from app.services.achievements import ACHIEVEMENTS_DEFINITIONS


ACTIVITY_COLLECTIONS = [
    "chores",
    "payments",
    "goals",
    "savings_goals",
    "withdrawals",
    "notifications",
    "achievements",
    "family_challenge_history",
]

PROFILE_PRESETS: Dict[str, Dict[str, float]] = {
    # USD-oriented, conservative for Ecuador.
    "ecuador": {
        "goal_base": 60.0,
        "goal_step": 20.0,
        "chore_big": 3.0,
        "chore_mid": 2.0,
        "chore_small": 1.5,
        "approved_pay": 3.5,
        "savings_cap": 1.0,
        "streak_bonus": 0.5,
        "withdraw_pending": 5.0,
        "withdraw_approved": 3.0,
    },
    # Balanced generic LatAm demo.
    "latam": {
        "goal_base": 90.0,
        "goal_step": 30.0,
        "chore_big": 5.0,
        "chore_mid": 3.0,
        "chore_small": 2.0,
        "approved_pay": 5.5,
        "savings_cap": 1.8,
        "streak_bonus": 0.8,
        "withdraw_pending": 8.0,
        "withdraw_approved": 5.0,
    },
    # Higher demo amounts for stress/visual testing.
    "high": {
        "goal_base": 220.0,
        "goal_step": 80.0,
        "chore_big": 12.0,
        "chore_mid": 8.0,
        "chore_small": 5.0,
        "approved_pay": 14.0,
        "savings_cap": 4.0,
        "streak_bonus": 2.0,
        "withdraw_pending": 20.0,
        "withdraw_approved": 12.0,
    },
}


def _u() -> str:
    return str(uuid.uuid4())


def _child_names(children: List[Dict[str, Any]]) -> Dict[str, str]:
    return {c["id"]: c.get("name", "Hijo") for c in children}


async def clean_family_activity_data(family_ids: List[str]) -> None:
    if not family_ids:
        return
    for coll_name in ACTIVITY_COLLECTIONS:
        coll = getattr(db, coll_name)
        result = await coll.delete_many({"family_id": {"$in": family_ids}})
        print(f" - cleaned {coll_name}: {result.deleted_count}")


async def seed_for_family(
    family: Dict[str, Any],
    children: List[Dict[str, Any]],
    preset: Dict[str, float],
) -> None:
    family_id = family["id"]
    currency = family.get("currency", "MXN")
    names = _child_names(children)
    now = datetime.now(UTC).replace(tzinfo=None)

    print(f"\nSeeding family '{family.get('name', family_id)}' ({len(children)} children)")

    all_notifications: List[Dict[str, Any]] = []

    for idx, ch in enumerate(children):
        child_id = ch["id"]
        child_name = names[child_id]
        base = now - timedelta(days=idx * 2)

        # Savings goal with milestone-like progress.
        target_amt = preset["goal_base"] + (idx * preset["goal_step"])
        saved_amt = round(target_amt * (0.45 + (idx % 3) * 0.15), 2)
        reached = [25]
        if saved_amt >= target_amt * 0.5:
            reached.append(50)
        if saved_amt >= target_amt * 0.75:
            reached.append(75)
        if saved_amt >= target_amt:
            reached.append(100)
        sg_id = _u()
        await db.savings_goals.insert_one(
            {
                "id": sg_id,
                "title": f"Meta {child_name}",
                "note": "Ahorro para objetivo personal",
                "target_amount": target_amt,
                "saved_amount": saved_amt,
                "child_id": child_id,
                "family_id": family_id,
                "created_at": base - timedelta(days=20),
                "is_completed": saved_amt >= target_amt,
                "milestones_reached": reached,
                "last_milestone_reached": reached[-1] if reached else None,
            }
        )

        # Chores in mixed states.
        chore_ids = [_u(), _u(), _u()]
        chores = [
            {
                "id": chore_ids[0],
                "title": f"Ordenar habitación ({child_name})",
                "description": "Organizar juguetes/libros",
                "amount": preset["chore_big"],
                "frequency": "semanal",
                "assigned_to": [child_id],
                "status": "aprobada",
                "completed_by": child_id,
                "completed_at": base - timedelta(days=4),
                "comment": "Listo",
                "family_id": family_id,
                "created_at": base - timedelta(days=6),
                "scheduled_date": base - timedelta(days=5),
                "photo_url": None,
                "rating": 5,
                "parent_feedback": "Excelente trabajo",
                "quality_bonus": 5.0,
            },
            {
                "id": chore_ids[1],
                "title": f"Lavar platos ({child_name})",
                "description": "Después de la cena",
                "amount": preset["chore_mid"],
                "frequency": "diaria",
                "assigned_to": [child_id],
                "status": "completada",
                "completed_by": child_id,
                "completed_at": base - timedelta(days=1),
                "comment": "Hecho",
                "family_id": family_id,
                "created_at": base - timedelta(days=2),
                "scheduled_date": base - timedelta(days=1),
                "photo_url": None,
                "rating": None,
                "parent_feedback": None,
                "quality_bonus": 0.0,
            },
            {
                "id": chore_ids[2],
                "title": f"Sacar basura ({child_name})",
                "description": "Lunes y jueves",
                "amount": preset["chore_small"],
                "frequency": "semanal",
                "assigned_to": [child_id],
                "status": "pendiente",
                "completed_by": None,
                "completed_at": None,
                "comment": None,
                "family_id": family_id,
                "created_at": base,
                "scheduled_date": base + timedelta(days=1),
                "photo_url": None,
                "rating": None,
                "parent_feedback": None,
                "quality_bonus": 0.0,
            },
        ]
        await db.chores.insert_many(chores)

        # Payments
        chore_payment_amt = preset["approved_pay"]
        savings_alloc = round(min(preset["savings_cap"], chore_payment_amt * 0.3), 2)
        p1 = {
            "id": _u(),
            "child_id": child_id,
            "chore_id": chore_ids[0],
            "chore_title": f"Ordenar habitación ({child_name})",
            "amount": chore_payment_amt,
            "status": "aprobado",
            "family_id": family_id,
            "created_at": base - timedelta(days=4),
            "payment_type": "chore",
            "purpose_note": None,
            "quality_bonus": round(max(0.0, preset["approved_pay"] - preset["chore_big"]), 2),
            "chore_base_amount": preset["chore_big"],
            "withdrawal_id": None,
            "savings_allocated": savings_alloc,
            "savings_goal_id": sg_id,
            "savings_reason_note": "Para cumplir mi meta",
        }
        p2 = {
            "id": _u(),
            "child_id": child_id,
            "chore_id": chore_ids[0],
            "chore_title": "Match de ahorro",
            "amount": round(savings_alloc * 0.2, 2),
            "status": "aprobado",
            "family_id": family_id,
            "created_at": base - timedelta(days=3, hours=20),
            "payment_type": "savings_match",
            "purpose_note": None,
            "quality_bonus": 0.0,
            "withdrawal_id": None,
            "savings_allocated": None,
            "savings_goal_id": sg_id,
        }
        p3 = {
            "id": _u(),
            "child_id": child_id,
            "chore_id": chore_ids[0],
            "chore_title": "Bono racha ahorro",
            "amount": preset["streak_bonus"],
            "status": "aprobado",
            "family_id": family_id,
            "created_at": base - timedelta(days=2, hours=12),
            "payment_type": "savings_streak_bonus",
            "purpose_note": None,
            "quality_bonus": 0.0,
            "withdrawal_id": None,
            "savings_allocated": None,
            "savings_goal_id": None,
        }
        await db.payments.insert_many([p1, p2, p3])

        # Withdrawals + withdrawal payment for approved one.
        wd_pending_id = _u()
        wd_approved_id = _u()
        await db.withdrawals.insert_many(
            [
                {
                    "id": wd_pending_id,
                    "child_id": child_id,
                    "amount": preset["withdraw_pending"],
                    "status": "pending",
                    "note": "Comprar material escolar",
                    "purpose_type": "necesidad",
                    "goal_impact_note": "Reduce un poco el avance este mes",
                    "parent_note": None,
                    "family_id": family_id,
                    "created_at": base - timedelta(hours=6),
                    "resolved_at": None,
                },
                {
                    "id": wd_approved_id,
                    "child_id": child_id,
                    "amount": preset["withdraw_approved"],
                    "status": "approved",
                    "note": "Helado del fin de semana",
                    "purpose_type": "deseo",
                    "goal_impact_note": "Mantengo la meta si ahorro en la semana",
                    "parent_note": "Pagado en efectivo",
                    "family_id": family_id,
                    "created_at": base - timedelta(days=7),
                    "resolved_at": base - timedelta(days=7, hours=-2),
                },
            ]
        )
        await db.payments.insert_one(
            {
                "id": _u(),
                "child_id": child_id,
                "chore_id": "",
                "chore_title": "Retiro aprobado",
                "amount": preset["withdraw_approved"],
                "status": "aprobado",
                "family_id": family_id,
                "created_at": base - timedelta(days=7, hours=-2),
                "payment_type": "withdrawal",
                "purpose_note": "Pago en efectivo",
                "quality_bonus": 0.0,
                "withdrawal_id": wd_approved_id,
                "savings_allocated": None,
                "savings_goal_id": None,
            }
        )

        # Achievements (pick 2 stable definitions).
        for a_type in ("first_task", "tasks_5"):
            definition = ACHIEVEMENTS_DEFINITIONS[a_type]
            await db.achievements.insert_one(
                {
                    "id": _u(),
                    "type": a_type,
                    "title": definition["title"],
                    "description": definition["description"],
                    "icon": definition["icon"],
                    "child_id": child_id,
                    "family_id": family_id,
                    "earned_at": base - timedelta(days=3),
                }
            )

        # Notifications
        notifs = [
            {
                "id": _u(),
                "type": "task_approved",
                "title": "¡Tarea aprobada!",
                "message": f"{child_name} ganó {currency} {chore_payment_amt:.2f}",
                "child_id": child_id,
                "is_read": False,
                "family_id": family_id,
                "created_at": base - timedelta(days=4),
            },
            {
                "id": _u(),
                "type": "savings_match",
                "title": "¡Match de ahorro!",
                "message": f"Se aplicó match por ahorro para {child_name}",
                "child_id": child_id,
                "is_read": False,
                "family_id": family_id,
                "created_at": base - timedelta(days=3, hours=20),
            },
            {
                "id": _u(),
                "type": "achievement",
                "title": "¡Nuevo logro!",
                "message": f"{child_name} desbloqueó un logro",
                "child_id": child_id,
                "is_read": True,
                "family_id": family_id,
                "created_at": base - timedelta(days=3),
            },
            {
                "id": _u(),
                "type": "withdrawal_request",
                "title": "Solicitud de retiro",
                "message": f"{child_name} solicitó un retiro de {currency} {preset['withdraw_pending']:.2f}",
                "child_id": child_id,
                "is_read": False,
                "family_id": family_id,
                "created_at": base - timedelta(hours=6),
            },
        ]
        all_notifications.extend(notifs)

        # Update child balance and streak fields to match demo.
        credit = p1["amount"] + p2["amount"] + p3["amount"]
        debit = preset["withdraw_approved"]  # approved withdrawal paid
        new_balance = round(max(0.0, credit - debit), 2)
        await db.children.update_one(
            {"id": child_id},
            {
                "$set": {
                    "balance": new_balance,
                    "current_streak": 4 + idx,
                    "best_streak": max(6, 4 + idx),
                    "savings_current_streak": 4 + idx,
                    "savings_best_streak": max(6, 4 + idx),
                    "last_task_date": base - timedelta(days=1),
                    "last_savings_date": base - timedelta(days=2),
                }
            },
        )

    if all_notifications:
        await db.notifications.insert_many(all_notifications)

    # Upsert family challenge row for current month.
    month_key = now.strftime("%Y-%m")
    await db.family_challenge_history.update_one(
        {"family_id": family_id, "month_key": month_key},
        {
            "$set": {
                "family_id": family_id,
                "month_key": month_key,
                "target_percent": float(family.get("family_challenge_target_percent") or 15.0),
                "all_children_hit_target": False,
                "updated_at": now,
            },
            "$setOnInsert": {"created_at": now},
        },
        upsert=True,
    )

    print(f" - seeded chores/payments/withdrawals/goals/achievements/notifications for {len(children)} child(ren)")


async def run(clean: bool, profile: str) -> None:
    children = await db.children.find({}).to_list(500)
    if not children:
        print("No children found. Nothing seeded.")
        return

    family_ids = sorted({c.get("family_id") for c in children if c.get("family_id")})
    families = await db.families.find({"id": {"$in": family_ids}}).to_list(200)
    family_map = {f["id"]: f for f in families}

    if profile not in PROFILE_PRESETS:
        valid = ", ".join(sorted(PROFILE_PRESETS.keys()))
        raise ValueError(f"Invalid profile '{profile}'. Use one of: {valid}")
    preset = PROFILE_PRESETS[profile]

    if clean:
        print(f"Cleaning family-scoped activity data (users/children untouched) [{profile}]...")
        await clean_family_activity_data(family_ids)

    for fid in family_ids:
        fam = family_map.get(fid) or {"id": fid, "name": fid, "currency": "MXN"}
        fam_children = [c for c in children if c.get("family_id") == fid]
        await seed_for_family(fam, fam_children, preset)

    print("\nDone. Users and children were preserved.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed local demo data without removing users/children")
    parser.add_argument("--clean", action="store_true", help="Clean activity collections before seeding")
    parser.add_argument(
        "--profile",
        default="ecuador",
        choices=sorted(PROFILE_PRESETS.keys()),
        help="Preset amounts profile (default: ecuador)",
    )
    args = parser.parse_args()
    asyncio.run(run(clean=args.clean, profile=args.profile))


if __name__ == "__main__":
    main()

