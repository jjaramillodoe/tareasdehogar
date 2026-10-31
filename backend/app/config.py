import os
import secrets
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient

ROOT_DIR = Path(__file__).resolve().parent.parent
load_dotenv(ROOT_DIR / ".env")

mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get("DB_NAME", "tareas_hogar")]

SECRET_KEY = os.environ.get("JWT_SECRET", secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 1 week

# Password reset (forgot-password flow)
PASSWORD_RESET_TOKEN_TTL_MINUTES = int(os.environ.get("PASSWORD_RESET_TOKEN_TTL_MINUTES", "60"))
# Resend: https://resend.com/api-keys — if set, emails go directly to Resend.
RESEND_API_KEY = os.environ.get("RESEND_API_KEY", "").strip()
EMAIL_FROM = os.environ.get("EMAIL_FROM", "HabitApp <beth.t@example.com>").strip()
EMAIL_REPLY_TO = os.environ.get("EMAIL_REPLY_TO", "").strip()
# HTTPS URL recommended (Gmail often blocks custom schemes). Token is appended as ?token=
PASSWORD_RESET_LINK_BASE = os.environ.get("PASSWORD_RESET_LINK_BASE", "habitapp://reset-password").strip()
PASSWORD_RESET_APP_LINK_BASE = os.environ.get("PASSWORD_RESET_APP_LINK_BASE", "").strip()
PASSWORD_RESET_EMAIL_WEBHOOK_URL = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_URL", "").strip()
PASSWORD_RESET_EMAIL_WEBHOOK_SECRET = os.environ.get("PASSWORD_RESET_EMAIL_WEBHOOK_SECRET", "").strip()

# CORS — comma-separated origins. Use * only for local/dev.
_cors_raw = os.environ.get("CORS_ORIGINS", "*").strip()
if _cors_raw == "*" or not _cors_raw:
    CORS_ORIGINS: list[str] = ["*"]
else:
    CORS_ORIGINS = [o.strip() for o in _cors_raw.split(",") if o.strip()]
