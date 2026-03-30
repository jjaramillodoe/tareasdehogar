import uuid
from datetime import datetime
from typing import List

from fastapi import APIRouter, Depends, HTTPException

from app.config import db
from app.deps import get_current_user, get_current_user_or_child, hash_password, verify_password
from app.models import ChildCreate, ChildLogin, ChildResponse, ChildUpdate

router = APIRouter(prefix="/children", tags=["children"])


def _child_to_response(c: dict) -> ChildResponse:
    return ChildResponse(
        id=c["id"],
        name=c["name"],
        age=c["age"],
        alias=c.get("alias"),
        gender=c.get("gender"),
        balance=float(c.get("balance", 0.0)),
        family_id=c["family_id"],
        created_at=c["created_at"],
        savings_on_approve_percent=float(c.get("savings_on_approve_percent") or 0),
        savings_on_approve_goal_id=c.get("savings_on_approve_goal_id"),
        savings_current_streak=int(c.get("savings_current_streak") or 0),
        savings_best_streak=int(c.get("savings_best_streak") or 0),
    )


@router.post("", response_model=ChildResponse)
async def create_child(child_data: ChildCreate, current_user: dict = Depends(get_current_user)):
    """Agregar un hijo a la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")

    if child_data.age >= 19:
        raise HTTPException(status_code=400, detail="Los hijos deben ser menores de 19 años")

    child_id = str(uuid.uuid4())
    child = {
        "id": child_id,
        "name": child_data.name,
        "age": child_data.age,
        "alias": child_data.alias or child_data.name,
        "pin_hash": hash_password(child_data.pin) if child_data.pin else None,
        "balance": 0.0,
        "savings_on_approve_percent": 10.0,
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow(),
    }
    if child_data.gender is not None:
        child["gender"] = child_data.gender
    await db.children.insert_one(child)

    return _child_to_response(child)


@router.get("", response_model=List[ChildResponse])
async def get_children(current_user: dict = Depends(get_current_user)):
    """Obtener todos los hijos de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")

    children = await db.children.find({"family_id": current_user["family_id"]}).to_list(100)
    return [_child_to_response(c) for c in children]


@router.post("/login", response_model=ChildResponse)
async def child_login(login_data: ChildLogin, current_user: dict = Depends(get_current_user)):
    """Iniciar sesión como hijo (para vista de hijo)"""
    child = await db.children.find_one(
        {"id": login_data.child_id, "family_id": current_user.get("family_id")}
    )
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    if child.get("pin_hash"):
        if not login_data.pin:
            raise HTTPException(status_code=401, detail="PIN requerido")
        if not verify_password(login_data.pin, child["pin_hash"]):
            raise HTTPException(status_code=401, detail="PIN incorrecto")

    return _child_to_response(child)


@router.get("/{child_id}", response_model=ChildResponse)
async def get_child(child_id: str, current_user: dict = Depends(get_current_user_or_child)):
    """Obtener información de un hijo específico"""
    if current_user.get("is_child_session") and child_id != current_user["child_id"]:
        raise HTTPException(status_code=403, detail="No autorizado")
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    return _child_to_response(child)


@router.put("/{child_id}", response_model=ChildResponse)
async def update_child(child_id: str, child_data: ChildUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar información de un hijo"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    update_data = {}
    if child_data.name is not None:
        update_data["name"] = child_data.name
    if child_data.age is not None:
        if child_data.age >= 19:
            raise HTTPException(status_code=400, detail="La edad debe ser menor a 19 años")
        update_data["age"] = child_data.age
    if child_data.alias is not None:
        update_data["alias"] = child_data.alias
    if child_data.pin is not None:
        update_data["pin_hash"] = hash_password(child_data.pin)

    patch = child_data.model_dump(exclude_unset=True)
    if "savings_on_approve_percent" in patch:
        update_data["savings_on_approve_percent"] = float(patch["savings_on_approve_percent"])
    if "savings_on_approve_goal_id" in patch:
        gid = patch.get("savings_on_approve_goal_id")
        if gid:
            g = await db.savings_goals.find_one(
                {"id": gid, "child_id": child_id, "family_id": current_user["family_id"]}
            )
            if not g:
                raise HTTPException(status_code=400, detail="Meta de ahorro no encontrada para este hijo")
            update_data["savings_on_approve_goal_id"] = gid
        else:
            update_data["savings_on_approve_goal_id"] = None

    if "gender" in patch:
        update_data["gender"] = patch["gender"]

    if update_data:
        await db.children.update_one({"id": child_id}, {"$set": update_data})

    updated = await db.children.find_one({"id": child_id})
    return _child_to_response(updated)


@router.delete("/{child_id}")
async def delete_child(child_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar un hijo de la familia"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")

    await db.children.delete_one({"id": child_id})
    await db.chores.update_many({"assigned_to": child_id}, {"$pull": {"assigned_to": child_id}})

    return {"message": "Hijo eliminado correctamente"}
