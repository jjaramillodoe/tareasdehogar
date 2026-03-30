import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request

from app.config import db
from app.deps import (
    create_access_token,
    create_child_access_token,
    get_current_user,
    get_current_user_or_child,
    hash_password,
    verify_password,
)
from app.models import (
    ChildPinChange,
    ChildFamilyBrief,
    ChildResponse,
    ChildStandaloneLogin,
    ChildTokenResponse,
    PasswordChange,
    TokenResponse,
    UserCreate,
    UserLogin,
    UserResponse,
)
from app.services.audit import log_audit_event

router = APIRouter(prefix="/auth", tags=["auth"])


def _normalize_device_name(raw: str | None, fallback: str | None = None) -> str:
    base = (raw or "").strip() or (fallback or "").strip() or "Dispositivo"
    return base[:120]


@router.post("/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate, request: Request):
    """Registrar un nuevo padre/tutor. Opcional: invite_code para unirse a una familia."""
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado")

    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "padre",
        "family_id": None,
        "family_role": None,
        "token_version": 0,
        "created_at": datetime.utcnow(),
    }

    if user_data.invite_code:
        code = user_data.invite_code.strip().upper()
        inv = await db.invites.find_one({"code": code, "used": False})
        if not inv:
            raise HTTPException(status_code=400, detail="Código de invitación inválido")
        if inv["expires_at"] < datetime.utcnow():
            raise HTTPException(status_code=400, detail="Código de invitación expirado")
        user["family_id"] = inv["family_id"]
        user["family_role"] = "parent"
        await db.invites.update_one(
            {"id": inv["id"]},
            {"$set": {"used": True, "used_by_user_id": user_id, "used_at": datetime.utcnow()}},
        )

    await db.users.insert_one(user)

    session_id = str(uuid.uuid4())
    await db.auth_sessions.insert_one(
        {
            "id": session_id,
            "user_id": user_id,
            "family_id": user.get("family_id"),
            "device_name": _normalize_device_name(
                user_data.device_name, request.headers.get("user-agent")
            ),
            "created_at": datetime.utcnow(),
            "last_seen_at": datetime.utcnow(),
        }
    )
    access_token = create_access_token(
        data={"sub": user_id, "tv": int(user.get("token_version") or 0), "sid": session_id}
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role="padre",
            family_id=user.get("family_id"),
            family_role=user.get("family_role"),
            created_at=user["created_at"],
        ),
    )


@router.post("/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin, request: Request):
    """Iniciar sesión de padre/tutor"""
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")

    session_id = str(uuid.uuid4())
    await db.auth_sessions.insert_one(
        {
            "id": session_id,
            "user_id": user["id"],
            "family_id": user.get("family_id"),
            "device_name": _normalize_device_name(
                login_data.device_name, request.headers.get("user-agent")
            ),
            "created_at": datetime.utcnow(),
            "last_seen_at": datetime.utcnow(),
        }
    )
    access_token = create_access_token(
        data={"sub": user["id"], "tv": int(user.get("token_version") or 0), "sid": session_id}
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            family_id=user.get("family_id"),
            family_role=user.get("family_role"),
            created_at=user["created_at"],
        ),
    )


@router.get("/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Obtener información del usuario actual"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        family_id=current_user.get("family_id"),
        family_role=current_user.get("family_role"),
        created_at=current_user["created_at"],
    )


@router.post("/child-login", response_model=ChildTokenResponse)
async def child_standalone_login(data: ChildStandaloneLogin):
    """Entrada para hijos: código de familia + nombre + PIN (si el padre configuró PIN)."""
    code = data.family_code.strip().upper()
    family = await db.families.find_one({"child_login_code": code})
    if not family:
        raise HTTPException(status_code=400, detail="Código de familia incorrecto")

    key = data.child_name.strip().lower()
    children = await db.children.find({"family_id": family["id"]}).to_list(100)
    child = None
    for ch in children:
        if ch["name"].strip().lower() == key:
            child = ch
            break
        if ch.get("alias") and str(ch["alias"]).strip().lower() == key:
            child = ch
            break
    if not child:
        raise HTTPException(status_code=400, detail="Nombre no encontrado en esta familia")

    lock_until = child.get("pin_locked_until")
    if lock_until and isinstance(lock_until, datetime) and lock_until > datetime.utcnow():
        remaining = int((lock_until - datetime.utcnow()).total_seconds() // 60) + 1
        raise HTTPException(
            status_code=429,
            detail=f"PIN bloqueado temporalmente. Intenta de nuevo en {max(1, remaining)} min",
        )

    if child.get("pin_hash"):
        if not data.pin:
            raise HTTPException(status_code=401, detail="PIN requerido")
        if not verify_password(data.pin, child["pin_hash"]):
            max_attempts = int(family.get("pin_failed_attempt_limit") or 5)
            lock_minutes = int(family.get("pin_lockout_minutes") or 15)
            failed_attempts = int(child.get("pin_failed_attempts") or 0) + 1
            update_doc = {"pin_failed_attempts": failed_attempts}
            if failed_attempts >= max_attempts:
                update_doc["pin_failed_attempts"] = 0
                update_doc["pin_locked_until"] = datetime.utcnow() + timedelta(minutes=lock_minutes)
            await db.children.update_one({"id": child["id"]}, {"$set": update_doc})
            if failed_attempts >= max_attempts:
                raise HTTPException(
                    status_code=429,
                    detail=f"PIN bloqueado por seguridad ({lock_minutes} min).",
                )
            raise HTTPException(status_code=401, detail="PIN incorrecto")
        if child.get("pin_failed_attempts") or child.get("pin_locked_until"):
            await db.children.update_one(
                {"id": child["id"]},
                {"$set": {"pin_failed_attempts": 0, "pin_locked_until": None}},
            )

    token = create_child_access_token(
        child["id"],
        family["id"],
        int(child.get("session_version") or 0),
    )
    return ChildTokenResponse(
        access_token=token,
        child=ChildResponse(
            id=child["id"],
            name=child["name"],
            age=child["age"],
            alias=child.get("alias"),
            balance=float(child.get("balance", 0.0)),
            family_id=child["family_id"],
            created_at=child["created_at"],
            savings_on_approve_percent=float(child.get("savings_on_approve_percent") or 0),
            savings_on_approve_goal_id=child.get("savings_on_approve_goal_id"),
        ),
        family=ChildFamilyBrief(
            id=family["id"],
            name=family["name"],
            currency=family["currency"],
        ),
    )


@router.get("/session")
async def auth_session(current_user: dict = Depends(get_current_user_or_child)):
    """Valida el token y devuelve si es padre o hijo (para arranque de la app)."""
    if current_user.get("is_child_session"):
        child = await db.children.find_one({"id": current_user["child_id"]})
        fam = await db.families.find_one({"id": current_user["family_id"]})
        if not child or not fam:
            raise HTTPException(status_code=401, detail="Sesión inválida")
        return {
            "type": "child",
            "child": {
                "id": child["id"],
                "name": child["name"],
                "age": child["age"],
                "alias": child.get("alias"),
                "balance": float(child.get("balance", 0.0)),
                "family_id": child["family_id"],
                "created_at": child["created_at"].isoformat() if hasattr(child["created_at"], "isoformat") else child["created_at"],
                "savings_on_approve_percent": float(child.get("savings_on_approve_percent") or 0),
                "savings_on_approve_goal_id": child.get("savings_on_approve_goal_id"),
            },
            "family": {
                "id": fam["id"],
                "name": fam["name"],
                "currency": fam["currency"],
            },
        }

    return {
        "type": "parent",
        "user": {
            "id": current_user["id"],
            "email": current_user["email"],
            "name": current_user["name"],
            "role": current_user["role"],
            "family_id": current_user.get("family_id"),
            "family_role": current_user.get("family_role"),
            "created_at": current_user["created_at"].isoformat()
            if hasattr(current_user["created_at"], "isoformat")
            else current_user["created_at"],
        },
    }


@router.post("/change-password")
async def change_password(data: PasswordChange, current_user: dict = Depends(get_current_user)):
    """Cambiar contraseña del padre/tutor autenticado."""
    if not verify_password(data.current_password, current_user["password_hash"]):
        raise HTTPException(status_code=400, detail="La contraseña actual no es correcta")
    if data.current_password == data.new_password:
        raise HTTPException(status_code=400, detail="La nueva contraseña debe ser diferente")

    await db.users.update_one(
        {"id": current_user["id"]},
        {
            "$set": {
                "password_hash": hash_password(data.new_password),
                "token_version": int(current_user.get("token_version") or 0) + 1,
            }
        },
    )
    await log_audit_event(
        family_id=current_user.get("family_id"),
        actor_user_id=current_user["id"],
        action="parent_password_changed",
        target_type="user",
        target_id=current_user["id"],
    )
    return {"ok": True}


@router.post("/change-child-pin")
async def change_child_pin(data: ChildPinChange, current_user: dict = Depends(get_current_user_or_child)):
    """
    Cambiar PIN de hijo.
    - Sesión hijo: cambia su propio PIN (si tenía PIN, pide current_pin).
    - Sesión padre: puede cambiar PIN de cualquier hijo de su familia enviando child_id.
    """
    if current_user.get("is_child_session"):
        child_id = current_user["child_id"]
        child = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
        if not child:
            raise HTTPException(status_code=404, detail="Hijo no encontrado")
        if child.get("pin_hash"):
            if not data.current_pin:
                raise HTTPException(status_code=400, detail="Ingresa tu PIN actual")
            if not verify_password(data.current_pin, child["pin_hash"]):
                raise HTTPException(status_code=400, detail="PIN actual incorrecto")
    else:
        if not data.child_id:
            raise HTTPException(status_code=400, detail="child_id es requerido")
        child_id = data.child_id
        child = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
        if not child:
            raise HTTPException(status_code=404, detail="Hijo no encontrado")

    await db.children.update_one(
        {"id": child_id},
        {
            "$set": {
                "pin_hash": hash_password(data.new_pin),
                "pin_failed_attempts": 0,
                "pin_locked_until": None,
            },
            "$inc": {"session_version": 1},
        },
    )
    await log_audit_event(
        family_id=current_user.get("family_id"),
        actor_user_id=current_user.get("id"),
        actor_child_id=current_user.get("child_id"),
        action="child_pin_changed",
        target_type="child",
        target_id=child_id,
    )
    return {"ok": True}


@router.post("/logout-all-sessions")
async def logout_all_sessions(current_user: dict = Depends(get_current_user)):
    """Invalida todas las sesiones activas del padre/tutor."""
    next_version = int(current_user.get("token_version") or 0) + 1
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"token_version": next_version}},
    )
    await db.auth_sessions.update_many(
        {"user_id": current_user["id"], "revoked_at": {"$exists": False}},
        {"$set": {"revoked_at": datetime.utcnow(), "revoked_reason": "logout_all"}},
    )
    await log_audit_event(
        family_id=current_user.get("family_id"),
        actor_user_id=current_user["id"],
        action="parent_logout_all_sessions",
        target_type="user",
        target_id=current_user["id"],
    )
    return {"ok": True}


@router.get("/sessions")
async def list_my_sessions(current_user: dict = Depends(get_current_user)):
    rows = await (
        db.auth_sessions.find(
            {"user_id": current_user["id"], "revoked_at": {"$exists": False}},
            {"_id": 0},
        )
        .sort("last_seen_at", -1)
        .to_list(50)
    )
    current_sid = current_user.get("_session_id")
    out = []
    for r in rows:
        out.append(
            {
                "id": r["id"],
                "device_name": r.get("device_name") or "Dispositivo",
                "created_at": r.get("created_at"),
                "last_seen_at": r.get("last_seen_at"),
                "is_current": bool(current_sid and r["id"] == current_sid),
            }
        )
    return out


@router.post("/sessions/{session_id}/revoke")
async def revoke_my_session(session_id: str, current_user: dict = Depends(get_current_user)):
    row = await db.auth_sessions.find_one(
        {"id": session_id, "user_id": current_user["id"], "revoked_at": {"$exists": False}}
    )
    if not row:
        raise HTTPException(status_code=404, detail="Sesión no encontrada")
    await db.auth_sessions.update_one(
        {"id": session_id},
        {"$set": {"revoked_at": datetime.utcnow(), "revoked_reason": "manual_revoke"}},
    )
    await log_audit_event(
        family_id=current_user.get("family_id"),
        actor_user_id=current_user["id"],
        action="parent_session_revoked",
        target_type="session",
        target_id=session_id,
    )
    return {"ok": True}
