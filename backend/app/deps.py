import hashlib
from datetime import datetime, timedelta
from typing import Any, Dict, Optional

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.config import ALGORITHM, ACCESS_TOKEN_EXPIRE_HOURS, SECRET_KEY, db

security = HTTPBearer()

CHILD_TOKEN_EXPIRE_DAYS = 90


def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed: str) -> bool:
    return hash_password(password) == hashed


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_child_access_token(child_id: str, family_id: str, session_version: int = 0) -> str:
    """JWT para sesión solo-hijo (sin cuenta de padre)."""
    expire = datetime.utcnow() + timedelta(days=CHILD_TOKEN_EXPIRE_DAYS)
    to_encode = {
        "typ": "child",
        "cid": child_id,
        "fid": family_id,
        "cv": int(session_version or 0),
        "exp": expire,
    }
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
):
    token = credentials.credentials
    payload: dict
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    token_version = int(payload.get("tv") or 0)
    current_version = int(user.get("token_version") or 0)
    if token_version != current_version:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    sid = payload.get("sid")
    if sid:
        session_row = await db.auth_sessions.find_one(
            {"id": sid, "user_id": user_id, "revoked_at": {"$exists": False}}
        )
        if not session_row:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        await db.auth_sessions.update_one({"id": sid}, {"$set": {"last_seen_at": datetime.utcnow()}})
        user["_session_id"] = sid
    return user


async def get_current_user_or_child(
    credentials: HTTPAuthorizationCredentials = Depends(security),
) -> Dict[str, Any]:
    """Acepta JWT de padre (sub) o de hijo (typ=child)."""
    token = credentials.credentials
    payload: dict
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expirado")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    if payload.get("typ") == "child":
        cid = payload.get("cid")
        fid = payload.get("fid")
        if not cid or not fid:
            raise HTTPException(status_code=401, detail="Token inválido")
        child = await db.children.find_one({"id": cid, "family_id": fid})
        if not child:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        token_version = int(payload.get("cv") or 0)
        current_version = int(child.get("session_version") or 0)
        if token_version != current_version:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        return {
            "is_child_session": True,
            "child_id": child["id"],
            "family_id": child["family_id"],
            "role": "hijo",
            "id": None,
            "email": None,
            "name": child.get("name"),
        }

    user_id = payload.get("sub")
    if user_id is None:
        raise HTTPException(status_code=401, detail="Token inválido")

    user = await db.users.find_one({"id": user_id})
    if user is None:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    token_version = int(payload.get("tv") or 0)
    current_version = int(user.get("token_version") or 0)
    if token_version != current_version:
        raise HTTPException(status_code=401, detail="Sesión inválida")
    sid = payload.get("sid")
    if sid:
        session_row = await db.auth_sessions.find_one(
            {"id": sid, "user_id": user_id, "revoked_at": {"$exists": False}}
        )
        if not session_row:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        await db.auth_sessions.update_one({"id": sid}, {"$set": {"last_seen_at": datetime.utcnow()}})
        user["_session_id"] = sid
    user["is_child_session"] = False
    return user
