import logging

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware

from app.config import client
from app.routers import (
    achievements,
    auth,
    children,
    chores,
    families,
    goals,
    health,
    notifications,
    payments,
    savings_goals,
    stats,
    withdrawals,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
)

app = FastAPI(title="HabitApp API")

api_router = APIRouter(prefix="/api")
api_router.include_router(health.router)
api_router.include_router(auth.router)
api_router.include_router(families.router)
api_router.include_router(children.router)
api_router.include_router(chores.router)
api_router.include_router(payments.router)
api_router.include_router(withdrawals.router)
api_router.include_router(stats.router)
api_router.include_router(goals.router)
api_router.include_router(savings_goals.router)
api_router.include_router(notifications.router)
api_router.include_router(achievements.router)

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
