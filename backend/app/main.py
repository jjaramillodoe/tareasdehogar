import logging
from pathlib import Path

from fastapi import APIRouter, FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

from app.config import CORS_ORIGINS, ROOT_DIR, client
from app.routers import (
    achievements,
    auth,
    children,
    chores,
    families,
    goals,
    health,
    media,
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
api_router.include_router(media.router)

app.include_router(api_router)

_uploads_dir = Path(ROOT_DIR) / "uploads"
_uploads_dir.mkdir(parents=True, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=str(_uploads_dir)), name="uploads")

# Starlette disallows allow_origins=["*"] with allow_credentials=True.
_cors_wildcard = CORS_ORIGINS == ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=not _cors_wildcard,
    allow_origins=CORS_ORIGINS if not _cors_wildcard else ["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
