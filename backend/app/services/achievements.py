import uuid
from datetime import datetime
from typing import Optional

from app.config import db
from app.services.notifications import create_notification

ACHIEVEMENTS_DEFINITIONS = {
    # Inicio
    "first_task": {
        "title": "Primera Tarea",
        "description": "Completaste tu primera tarea",
        "icon": "star"
    },
    "first_5_days": {
        "title": "Buen Comienzo",
        "description": "Completaste tareas en 5 días diferentes",
        "icon": "sunny"
    },
    "first_reward": {
        "title": "Primera Recompensa",
        "description": "Canjeaste tu primera recompensa",
        "icon": "gift"
    },

    # Cantidad de tareas
    "tasks_5": {
        "title": "Trabajador",
        "description": "Completaste 5 tareas",
        "icon": "medal"
    },
    "tasks_10": {
        "title": "Súper Trabajador",
        "description": "Completaste 10 tareas",
        "icon": "trophy"
    },
    "tasks_15": {
        "title": "Constante",
        "description": "Completaste 15 tareas",
        "icon": "checkmark-circle"
    },
    "tasks_25": {
        "title": "Experto",
        "description": "Completaste 25 tareas",
        "icon": "ribbon"
    },
    "tasks_40": {
        "title": "Imparable",
        "description": "Completaste 40 tareas",
        "icon": "flash"
    },
    "tasks_50": {
        "title": "Maestro",
        "description": "Completaste 50 tareas",
        "icon": "crown"
    },
    "tasks_75": {
        "title": "Gran Ayudante",
        "description": "Completaste 75 tareas",
        "icon": "shield"
    },
    "tasks_100": {
        "title": "Leyenda del Hogar",
        "description": "Completaste 100 tareas",
        "icon": "diamond"
    },

    # Rachas
    "streak_3": {
        "title": "Racha de 3",
        "description": "3 días consecutivos completando tareas",
        "icon": "flame"
    },
    "streak_5": {
        "title": "En Marcha",
        "description": "5 días consecutivos completando tareas",
        "icon": "flame"
    },
    "streak_7": {
        "title": "Racha Semanal",
        "description": "7 días consecutivos completando tareas",
        "icon": "flame"
    },
    "streak_14": {
        "title": "Racha de 2 Semanas",
        "description": "14 días consecutivos completando tareas",
        "icon": "flame"
    },
    "streak_21": {
        "title": "Súper Constancia",
        "description": "21 días consecutivos completando tareas",
        "icon": "flame"
    },
    "streak_30": {
        "title": "Racha Mensual",
        "description": "30 días consecutivos completando tareas",
        "icon": "flame"
    },

    # Metas
    "goal_completed": {
        "title": "Meta Cumplida",
        "description": "Completaste tu primera meta",
        "icon": "flag"
    },
    "goals_3": {
        "title": "Soñador",
        "description": "Completaste 3 metas",
        "icon": "rocket"
    },
    "goals_5": {
        "title": "Cumplidor",
        "description": "Completaste 5 metas",
        "icon": "flag"
    },
    "big_goal": {
        "title": "Gran Meta",
        "description": "Completaste una meta difícil",
        "icon": "trophy"
    },

    # Ganancias
    "earned_100": {
        "title": "Primer Centenario",
        "description": "Ganaste 100 en total",
        "icon": "cash"
    },
    "earned_250": {
        "title": "Juntando Monedas",
        "description": "Ganaste 250 en total",
        "icon": "logo-usd"
    },
    "earned_500": {
        "title": "Ahorrador",
        "description": "Ganaste 500 en total",
        "icon": "wallet"
    },
    "earned_1000": {
        "title": "Gran Ahorrador",
        "description": "Ganaste 1000 en total",
        "icon": "card"
    },

    # Variedad y equilibrio
    "different_tasks_5": {
        "title": "Multitalento",
        "description": "Completaste 5 tipos distintos de tareas",
        "icon": "apps"
    },
    "different_tasks_10": {
        "title": "Todoterreno",
        "description": "Completaste 10 tipos distintos de tareas",
        "icon": "grid"
    },
    "room_helper": {
        "title": "Ayudante del Cuarto",
        "description": "Completaste varias tareas de tu habitación",
        "icon": "bed"
    },
    "kitchen_helper": {
        "title": "Ayudante de Cocina",
        "description": "Completaste varias tareas de cocina",
        "icon": "restaurant"
    },
    "cleaning_star": {
        "title": "Estrella de Limpieza",
        "description": "Completaste 10 tareas de limpieza",
        "icon": "sparkles"
    },

    # Recompensas y uso del sistema
    "rewards_3": {
        "title": "Disfrutando tu Esfuerzo",
        "description": "Canjeaste 3 recompensas",
        "icon": "gift"
    },
    "saver": {
        "title": "Paciente",
        "description": "Guardaste puntos sin gastarlos por varios días",
        "icon": "hourglass"
    },

    # Constancia semanal
    "week_full": {
        "title": "Semana Completa",
        "description": "Completaste al menos una tarea cada día de la semana",
        "icon": "calendar"
    },
    "weekend_helper": {
        "title": "Héroe del Fin de Semana",
        "description": "Completaste tareas sábado y domingo",
        "icon": "happy"
    },
    # Ahorro semanal
    "savings_streak_4w": {
        "title": "Ahorrador Semanal",
        "description": "Ahorraste al menos una vez por semana durante 4 semanas seguidas",
        "icon": "wallet"
    },
    "savings_streak_8w": {
        "title": "Maestro del Ahorro",
        "description": "Ahorraste al menos una vez por semana durante 8 semanas seguidas",
        "icon": "trophy"
    }
}


async def update_goal_progress(child_id: str, family_id: str):
    active_goals = await db.goals.find(
        {"child_id": child_id, "family_id": family_id, "is_completed": False}
    ).to_list(100)

    for goal in active_goals:
        new_count = goal["completed_tasks"] + 1
        is_completed = new_count >= goal["target_tasks"]

        await db.goals.update_one(
            {"id": goal["id"]},
            {"$set": {"completed_tasks": new_count, "is_completed": is_completed}},
        )

        if is_completed:
            child = await db.children.find_one({"id": child_id})
            await create_notification(
                family_id,
                "goal_achieved",
                "¡Meta cumplida!",
                f"{child['name']} completó la meta '{goal['title']}'. ¡Bono de {goal['bonus_amount']} disponible!",
                child_id,
            )

            existing = await db.achievements.find_one({"child_id": child_id, "type": "goal_completed"})
            if not existing:
                await award_achievement(child_id, family_id, "goal_completed")


async def check_and_award_achievements(child_id: str, family_id: str):
    child = await db.children.find_one({"id": child_id})
    if not child:
        return

    existing = await db.achievements.find({"child_id": child_id}).to_list(100)
    existing_types = [a["type"] for a in existing]

    task_count = await db.chores.count_documents({"completed_by": child_id, "status": "aprobada"})

    task_milestones = [
        ("first_task", 1),
        ("tasks_5", 5),
        ("tasks_10", 10),
        ("tasks_25", 25),
        ("tasks_50", 50),
    ]

    for achievement_type, required in task_milestones:
        if task_count >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)

    streak = child.get("current_streak", 0)
    streak_milestones = [
        ("streak_3", 3),
        ("streak_7", 7),
        ("streak_14", 14),
        ("streak_30", 30),
    ]

    for achievement_type, required in streak_milestones:
        if streak >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)

    total_earned = await db.payments.aggregate(
        [
            {"$match": {"child_id": child_id, "reversed_at": {"$exists": False}}},
            {"$group": {"_id": None, "total": {"$sum": "$amount"}}},
        ]
    ).to_list(1)

    total = total_earned[0]["total"] if total_earned else 0
    earning_milestones = [("earned_100", 100), ("earned_500", 500)]

    for achievement_type, required in earning_milestones:
        if total >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)


async def award_achievement(child_id: str, family_id: str, achievement_type: str):
    if achievement_type not in ACHIEVEMENTS_DEFINITIONS:
        return
    existing = await db.achievements.find_one({"child_id": child_id, "type": achievement_type})
    if existing:
        return

    definition = ACHIEVEMENTS_DEFINITIONS[achievement_type]
    achievement = {
        "id": str(uuid.uuid4()),
        "type": achievement_type,
        "title": definition["title"],
        "description": definition["description"],
        "icon": definition["icon"],
        "child_id": child_id,
        "earned_at": datetime.utcnow(),
    }
    await db.achievements.insert_one(achievement)

    child = await db.children.find_one({"id": child_id})
    await create_notification(
        family_id,
        "achievement",
        "¡Nuevo logro!",
        f"{child['name']} desbloqueó el logro '{definition['title']}'",
        child_id,
    )


async def update_child_streak(child_id: str, family_id: str):
    child = await db.children.find_one({"id": child_id})
    if not child:
        return

    today = datetime.utcnow().date()
    last_task_date = child.get("last_task_date")
    current_streak = child.get("current_streak", 0)
    best_streak = child.get("best_streak", 0)

    if last_task_date:
        last_date = last_task_date.date() if isinstance(last_task_date, datetime) else last_task_date
        days_diff = (today - last_date).days

        if days_diff == 0:
            return
        elif days_diff == 1:
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
                "last_task_date": datetime.utcnow(),
                "current_streak": current_streak,
                "best_streak": best_streak,
            }
        },
    )

    await check_and_award_achievements(child_id, family_id)
