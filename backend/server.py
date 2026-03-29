from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional
import uuid
from datetime import datetime, timedelta
import hashlib
import jwt
import secrets

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'tareas_hogar')]

# JWT Configuration
SECRET_KEY = os.environ.get('JWT_SECRET', secrets.token_hex(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24 * 7  # 1 week

# Create the main app
app = FastAPI(title="Tareas del Hogar API")

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer()

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# ==================== MODELS ====================

# User Models
class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    family_id: Optional[str] = None
    created_at: datetime

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# Family Models
class FamilyCreate(BaseModel):
    name: str
    currency: str = "MXN"

class FamilyResponse(BaseModel):
    id: str
    name: str
    currency: str
    owner_id: str
    created_at: datetime

class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None

# Child Models
class ChildCreate(BaseModel):
    name: str
    age: int
    alias: Optional[str] = None
    pin: Optional[str] = None

class ChildResponse(BaseModel):
    id: str
    name: str
    age: int
    alias: Optional[str] = None
    balance: float
    family_id: str
    created_at: datetime

class ChildUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    alias: Optional[str] = None
    pin: Optional[str] = None

class ChildLogin(BaseModel):
    child_id: str
    pin: Optional[str] = None

# Chore Models
class ChoreCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    frequency: str = "unica"  # unica, diaria, semanal
    assigned_to: List[str] = []  # List of child IDs

class ChoreResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    amount: float
    frequency: str
    assigned_to: List[str]
    status: str  # pendiente, completada, aprobada, rechazada
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    comment: Optional[str] = None
    family_id: str
    created_at: datetime

class ChoreUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    assigned_to: Optional[List[str]] = None

class ChoreComplete(BaseModel):
    comment: Optional[str] = None

# Payment Models
class PaymentResponse(BaseModel):
    id: str
    child_id: str
    chore_id: str
    chore_title: str
    amount: float
    status: str  # aprobado, pagado
    created_at: datetime

# Goal Models (Metas)
class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_tasks: int  # Number of tasks to complete
    bonus_amount: float  # Bonus reward
    child_id: str  # Assigned to specific child
    start_date: Optional[str] = None
    end_date: Optional[str] = None

class GoalResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    target_tasks: int
    bonus_amount: float
    child_id: str
    completed_tasks: int
    is_completed: bool
    bonus_paid: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    family_id: str
    created_at: datetime

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_tasks: Optional[int] = None
    bonus_amount: Optional[float] = None

# Notification Models
class NotificationResponse(BaseModel):
    id: str
    type: str  # task_completed, task_approved, goal_achieved, streak, reminder
    title: str
    message: str
    child_id: Optional[str] = None
    is_read: bool
    family_id: str
    created_at: datetime

# Achievement Models (Logros)
class AchievementResponse(BaseModel):
    id: str
    type: str  # streak_3, streak_7, streak_30, first_task, tasks_10, tasks_50, etc.
    title: str
    description: str
    icon: str
    child_id: str
    earned_at: datetime

# ==================== UTILITY FUNCTIONS ====================

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

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
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
    return user

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/register", response_model=TokenResponse)
async def register_user(user_data: UserCreate):
    """Registrar un nuevo padre/tutor"""
    # Check if email exists
    existing = await db.users.find_one({"email": user_data.email})
    if existing:
        raise HTTPException(status_code=400, detail="Este correo ya está registrado")
    
    # Create user
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": user_data.email,
        "password_hash": hash_password(user_data.password),
        "name": user_data.name,
        "role": "padre",
        "family_id": None,
        "created_at": datetime.utcnow()
    }
    await db.users.insert_one(user)
    
    # Create token
    access_token = create_access_token(data={"sub": user_id})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user_id,
            email=user_data.email,
            name=user_data.name,
            role="padre",
            family_id=None,
            created_at=user["created_at"]
        )
    )

@api_router.post("/auth/login", response_model=TokenResponse)
async def login_user(login_data: UserLogin):
    """Iniciar sesión de padre/tutor"""
    user = await db.users.find_one({"email": login_data.email})
    if not user or not verify_password(login_data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Correo o contraseña incorrectos")
    
    access_token = create_access_token(data={"sub": user["id"]})
    
    return TokenResponse(
        access_token=access_token,
        user=UserResponse(
            id=user["id"],
            email=user["email"],
            name=user["name"],
            role=user["role"],
            family_id=user.get("family_id"),
            created_at=user["created_at"]
        )
    )

@api_router.get("/auth/me", response_model=UserResponse)
async def get_me(current_user: dict = Depends(get_current_user)):
    """Obtener información del usuario actual"""
    return UserResponse(
        id=current_user["id"],
        email=current_user["email"],
        name=current_user["name"],
        role=current_user["role"],
        family_id=current_user.get("family_id"),
        created_at=current_user["created_at"]
    )

# ==================== FAMILY ENDPOINTS ====================

@api_router.post("/families", response_model=FamilyResponse)
async def create_family(family_data: FamilyCreate, current_user: dict = Depends(get_current_user)):
    """Crear una nueva familia"""
    # Check if user already has a family
    if current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Ya tienes una familia creada")
    
    family_id = str(uuid.uuid4())
    family = {
        "id": family_id,
        "name": family_data.name,
        "currency": family_data.currency,
        "owner_id": current_user["id"],
        "created_at": datetime.utcnow()
    }
    await db.families.insert_one(family)
    
    # Update user with family_id
    await db.users.update_one(
        {"id": current_user["id"]},
        {"$set": {"family_id": family_id}}
    )
    
    return FamilyResponse(**family)

@api_router.get("/families/my", response_model=FamilyResponse)
async def get_my_family(current_user: dict = Depends(get_current_user)):
    """Obtener la familia del usuario actual"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=404, detail="No tienes una familia. Crea una primero.")
    
    family = await db.families.find_one({"id": current_user["family_id"]})
    if not family:
        raise HTTPException(status_code=404, detail="Familia no encontrada")
    
    return FamilyResponse(**family)

@api_router.put("/families/my", response_model=FamilyResponse)
async def update_my_family(family_data: FamilyUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar la familia del usuario"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=404, detail="No tienes una familia")
    
    update_data = {k: v for k, v in family_data.dict().items() if v is not None}
    if update_data:
        await db.families.update_one(
            {"id": current_user["family_id"]},
            {"$set": update_data}
        )
    
    family = await db.families.find_one({"id": current_user["family_id"]})
    return FamilyResponse(**family)

# ==================== CHILDREN ENDPOINTS ====================

@api_router.post("/children", response_model=ChildResponse)
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
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow()
    }
    await db.children.insert_one(child)
    
    return ChildResponse(
        id=child_id,
        name=child_data.name,
        age=child_data.age,
        alias=child.get("alias"),
        balance=0.0,
        family_id=current_user["family_id"],
        created_at=child["created_at"]
    )

@api_router.get("/children", response_model=List[ChildResponse])
async def get_children(current_user: dict = Depends(get_current_user)):
    """Obtener todos los hijos de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    children = await db.children.find({"family_id": current_user["family_id"]}).to_list(100)
    return [
        ChildResponse(
            id=c["id"],
            name=c["name"],
            age=c["age"],
            alias=c.get("alias"),
            balance=c.get("balance", 0.0),
            family_id=c["family_id"],
            created_at=c["created_at"]
        )
        for c in children
    ]

@api_router.get("/children/{child_id}", response_model=ChildResponse)
async def get_child(child_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener información de un hijo específico"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    return ChildResponse(
        id=child["id"],
        name=child["name"],
        age=child["age"],
        alias=child.get("alias"),
        balance=child.get("balance", 0.0),
        family_id=child["family_id"],
        created_at=child["created_at"]
    )

@api_router.put("/children/{child_id}", response_model=ChildResponse)
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
    
    if update_data:
        await db.children.update_one({"id": child_id}, {"$set": update_data})
    
    updated = await db.children.find_one({"id": child_id})
    return ChildResponse(
        id=updated["id"],
        name=updated["name"],
        age=updated["age"],
        alias=updated.get("alias"),
        balance=updated.get("balance", 0.0),
        family_id=updated["family_id"],
        created_at=updated["created_at"]
    )

@api_router.delete("/children/{child_id}")
async def delete_child(child_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar un hijo de la familia"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    await db.children.delete_one({"id": child_id})
    await db.chores.update_many(
        {"assigned_to": child_id},
        {"$pull": {"assigned_to": child_id}}
    )
    
    return {"message": "Hijo eliminado correctamente"}

# Child login (for child view)
@api_router.post("/children/login", response_model=ChildResponse)
async def child_login(login_data: ChildLogin, current_user: dict = Depends(get_current_user)):
    """Iniciar sesión como hijo (para vista de hijo)"""
    child = await db.children.find_one({
        "id": login_data.child_id,
        "family_id": current_user.get("family_id")
    })
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    # Verify PIN if set
    if child.get("pin_hash"):
        if not login_data.pin:
            raise HTTPException(status_code=401, detail="PIN requerido")
        if not verify_password(login_data.pin, child["pin_hash"]):
            raise HTTPException(status_code=401, detail="PIN incorrecto")
    
    return ChildResponse(
        id=child["id"],
        name=child["name"],
        age=child["age"],
        alias=child.get("alias"),
        balance=child.get("balance", 0.0),
        family_id=child["family_id"],
        created_at=child["created_at"]
    )

# ==================== CHORES ENDPOINTS ====================

@api_router.post("/chores", response_model=ChoreResponse)
async def create_chore(chore_data: ChoreCreate, current_user: dict = Depends(get_current_user)):
    """Crear una nueva tarea"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")
    
    if chore_data.frequency not in ["unica", "diaria", "semanal"]:
        raise HTTPException(status_code=400, detail="Frecuencia inválida. Use: unica, diaria, semanal")
    
    # Verify assigned children belong to family
    for child_id in chore_data.assigned_to:
        child = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
        if not child:
            raise HTTPException(status_code=400, detail=f"Hijo con ID {child_id} no encontrado")
    
    chore_id = str(uuid.uuid4())
    chore = {
        "id": chore_id,
        "title": chore_data.title,
        "description": chore_data.description,
        "amount": chore_data.amount,
        "frequency": chore_data.frequency,
        "assigned_to": chore_data.assigned_to,
        "status": "pendiente",
        "completed_by": None,
        "completed_at": None,
        "comment": None,
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow()
    }
    await db.chores.insert_one(chore)
    
    return ChoreResponse(**chore)

@api_router.get("/chores", response_model=List[ChoreResponse])
async def get_chores(status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Obtener todas las tareas de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    query = {"family_id": current_user["family_id"]}
    if status:
        query["status"] = status
    
    chores = await db.chores.find(query).sort("created_at", -1).to_list(1000)
    return [ChoreResponse(**c) for c in chores]

@api_router.get("/chores/child/{child_id}", response_model=List[ChoreResponse])
async def get_chores_for_child(child_id: str, status: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Obtener tareas asignadas a un hijo específico"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    query = {
        "family_id": current_user["family_id"],
        "assigned_to": child_id
    }
    if status:
        query["status"] = status
    
    chores = await db.chores.find(query).sort("created_at", -1).to_list(1000)
    return [ChoreResponse(**c) for c in chores]

@api_router.get("/chores/{chore_id}", response_model=ChoreResponse)
async def get_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener una tarea específica"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    return ChoreResponse(**chore)

@api_router.put("/chores/{chore_id}", response_model=ChoreResponse)
async def update_chore(chore_id: str, chore_data: ChoreUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar una tarea"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    update_data = {k: v for k, v in chore_data.dict().items() if v is not None}
    
    if "assigned_to" in update_data:
        for child_id in update_data["assigned_to"]:
            child = await db.children.find_one({"id": child_id, "family_id": current_user["family_id"]})
            if not child:
                raise HTTPException(status_code=400, detail=f"Hijo con ID {child_id} no encontrado")
    
    if update_data:
        await db.chores.update_one({"id": chore_id}, {"$set": update_data})
    
    updated = await db.chores.find_one({"id": chore_id})
    return ChoreResponse(**updated)

@api_router.delete("/chores/{chore_id}")
async def delete_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una tarea"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    await db.chores.delete_one({"id": chore_id})
    return {"message": "Tarea eliminada correctamente"}

@api_router.post("/chores/{chore_id}/complete", response_model=ChoreResponse)
async def complete_chore(chore_id: str, complete_data: ChoreComplete, child_id: str, current_user: dict = Depends(get_current_user)):
    """Marcar una tarea como completada (por un hijo)"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if child_id not in chore.get("assigned_to", []):
        raise HTTPException(status_code=403, detail="Esta tarea no está asignada a este hijo")
    
    if chore["status"] != "pendiente":
        raise HTTPException(status_code=400, detail="Esta tarea ya no está pendiente")
    
    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "completada",
                "completed_by": child_id,
                "completed_at": datetime.utcnow(),
                "comment": complete_data.comment
            }
        }
    )
    
    updated = await db.chores.find_one({"id": chore_id})
    return ChoreResponse(**updated)

@api_router.post("/chores/{chore_id}/approve", response_model=ChoreResponse)
async def approve_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Aprobar una tarea completada"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if chore["status"] != "completada":
        raise HTTPException(status_code=400, detail="Solo se pueden aprobar tareas completadas")
    
    # Update chore status
    await db.chores.update_one(
        {"id": chore_id},
        {"$set": {"status": "aprobada"}}
    )
    
    # Add payment to child's balance
    child_id = chore["completed_by"]
    await db.children.update_one(
        {"id": child_id},
        {"$inc": {"balance": chore["amount"]}}
    )
    
    # Create payment record
    payment = {
        "id": str(uuid.uuid4()),
        "child_id": child_id,
        "chore_id": chore_id,
        "chore_title": chore["title"],
        "amount": chore["amount"],
        "status": "aprobado",
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow()
    }
    await db.payments.insert_one(payment)
    
    # Update streak and check achievements
    await update_child_streak(child_id, current_user["family_id"])
    
    # Update goal progress
    await update_goal_progress(child_id, current_user["family_id"])
    
    # Create notification
    child = await db.children.find_one({"id": child_id})
    await create_notification(
        current_user["family_id"],
        "task_approved",
        "¡Tarea aprobada!",
        f"La tarea '{chore['title']}' fue aprobada. {child['name']} ganó {chore['amount']}",
        child_id
    )
    
    updated = await db.chores.find_one({"id": chore_id})
    return ChoreResponse(**updated)

async def update_goal_progress(child_id: str, family_id: str):
    """Update progress on active goals when a task is approved"""
    # Find active goals for this child
    active_goals = await db.goals.find({
        "child_id": child_id,
        "family_id": family_id,
        "is_completed": False
    }).to_list(100)
    
    for goal in active_goals:
        new_count = goal["completed_tasks"] + 1
        is_completed = new_count >= goal["target_tasks"]
        
        await db.goals.update_one(
            {"id": goal["id"]},
            {
                "$set": {
                    "completed_tasks": new_count,
                    "is_completed": is_completed
                }
            }
        )
        
        if is_completed:
            child = await db.children.find_one({"id": child_id})
            await create_notification(
                family_id,
                "goal_achieved",
                "¡Meta cumplida!",
                f"{child['name']} completó la meta '{goal['title']}'. ¡Bono de {goal['bonus_amount']} disponible!",
                child_id
            )
            
            # Award goal achievement if first goal
            existing = await db.achievements.find_one({"child_id": child_id, "type": "goal_completed"})
            if not existing:
                await award_achievement(child_id, family_id, "goal_completed")

@api_router.post("/chores/{chore_id}/reject", response_model=ChoreResponse)
async def reject_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Rechazar una tarea completada"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    if chore["status"] != "completada":
        raise HTTPException(status_code=400, detail="Solo se pueden rechazar tareas completadas")
    
    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "rechazada",
            }
        }
    )
    
    updated = await db.chores.find_one({"id": chore_id})
    return ChoreResponse(**updated)

@api_router.post("/chores/{chore_id}/reset", response_model=ChoreResponse)
async def reset_chore(chore_id: str, current_user: dict = Depends(get_current_user)):
    """Restablecer una tarea a pendiente"""
    chore = await db.chores.find_one({"id": chore_id, "family_id": current_user.get("family_id")})
    if not chore:
        raise HTTPException(status_code=404, detail="Tarea no encontrada")
    
    await db.chores.update_one(
        {"id": chore_id},
        {
            "$set": {
                "status": "pendiente",
                "completed_by": None,
                "completed_at": None,
                "comment": None
            }
        }
    )
    
    updated = await db.chores.find_one({"id": chore_id})
    return ChoreResponse(**updated)

# ==================== PAYMENTS ENDPOINTS ====================

@api_router.get("/payments", response_model=List[PaymentResponse])
async def get_payments(current_user: dict = Depends(get_current_user)):
    """Obtener todos los pagos de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    payments = await db.payments.find({"family_id": current_user["family_id"]}).sort("created_at", -1).to_list(1000)
    return [PaymentResponse(**p) for p in payments]

@api_router.get("/payments/child/{child_id}", response_model=List[PaymentResponse])
async def get_child_payments(child_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener historial de pagos de un hijo"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    payments = await db.payments.find({
        "child_id": child_id,
        "family_id": current_user["family_id"]
    }).sort("created_at", -1).to_list(1000)
    
    return [PaymentResponse(**p) for p in payments]

# ==================== STATS ENDPOINTS ====================

@api_router.get("/stats/child/{child_id}")
async def get_child_stats(child_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener estadísticas de un hijo"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    # Count tasks by status
    pending = await db.chores.count_documents({
        "assigned_to": child_id,
        "status": "pendiente"
    })
    completed = await db.chores.count_documents({
        "completed_by": child_id,
        "status": {"$in": ["completada", "aprobada"]}
    })
    approved = await db.chores.count_documents({
        "completed_by": child_id,
        "status": "aprobada"
    })
    
    # Get streak
    streak = child.get("current_streak", 0)
    best_streak = child.get("best_streak", 0)
    
    return {
        "child_id": child_id,
        "balance": child.get("balance", 0.0),
        "pending_tasks": pending,
        "completed_tasks": completed,
        "approved_tasks": approved,
        "current_streak": streak,
        "best_streak": best_streak
    }

@api_router.get("/stats/family/report")
async def get_family_report(days: int = 7, current_user: dict = Depends(get_current_user)):
    """Obtener reporte de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    family_id = current_user["family_id"]
    start_date = datetime.utcnow() - timedelta(days=days)
    
    # Get all children
    children = await db.children.find({"family_id": family_id}).to_list(100)
    
    # Get tasks completed in period
    tasks_in_period = await db.chores.find({
        "family_id": family_id,
        "status": "aprobada",
        "completed_at": {"$gte": start_date}
    }).to_list(1000)
    
    # Get payments in period
    payments_in_period = await db.payments.find({
        "family_id": family_id,
        "created_at": {"$gte": start_date}
    }).to_list(1000)
    
    # Calculate daily stats
    daily_stats = {}
    for i in range(days):
        day = datetime.utcnow() - timedelta(days=i)
        day_str = day.strftime("%Y-%m-%d")
        daily_stats[day_str] = {
            "tasks_completed": 0,
            "amount_paid": 0.0
        }
    
    for task in tasks_in_period:
        if task.get("completed_at"):
            day_str = task["completed_at"].strftime("%Y-%m-%d")
            if day_str in daily_stats:
                daily_stats[day_str]["tasks_completed"] += 1
    
    for payment in payments_in_period:
        day_str = payment["created_at"].strftime("%Y-%m-%d")
        if day_str in daily_stats:
            daily_stats[day_str]["amount_paid"] += payment["amount"]
    
    # Stats per child
    children_stats = []
    for child in children:
        child_tasks = [t for t in tasks_in_period if t.get("completed_by") == child["id"]]
        child_payments = [p for p in payments_in_period if p.get("child_id") == child["id"]]
        children_stats.append({
            "child_id": child["id"],
            "name": child["name"],
            "tasks_completed": len(child_tasks),
            "amount_earned": sum(p["amount"] for p in child_payments),
            "balance": child.get("balance", 0.0),
            "current_streak": child.get("current_streak", 0)
        })
    
    return {
        "period_days": days,
        "total_tasks_completed": len(tasks_in_period),
        "total_amount_paid": sum(p["amount"] for p in payments_in_period),
        "daily_stats": daily_stats,
        "children_stats": children_stats
    }

# ==================== GOALS ENDPOINTS (METAS) ====================

@api_router.post("/goals", response_model=GoalResponse)
async def create_goal(goal_data: GoalCreate, current_user: dict = Depends(get_current_user)):
    """Crear una nueva meta para un hijo"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="Debes crear una familia primero")
    
    # Verify child exists
    child = await db.children.find_one({"id": goal_data.child_id, "family_id": current_user["family_id"]})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    goal_id = str(uuid.uuid4())
    goal = {
        "id": goal_id,
        "title": goal_data.title,
        "description": goal_data.description,
        "target_tasks": goal_data.target_tasks,
        "bonus_amount": goal_data.bonus_amount,
        "child_id": goal_data.child_id,
        "completed_tasks": 0,
        "is_completed": False,
        "bonus_paid": False,
        "start_date": datetime.fromisoformat(goal_data.start_date) if goal_data.start_date else datetime.utcnow(),
        "end_date": datetime.fromisoformat(goal_data.end_date) if goal_data.end_date else None,
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow()
    }
    await db.goals.insert_one(goal)
    
    # Create notification
    await create_notification(
        current_user["family_id"],
        "goal_created",
        "Nueva meta creada",
        f"Se ha creado la meta '{goal_data.title}' para {child['name']}",
        goal_data.child_id
    )
    
    return GoalResponse(**goal)

@api_router.get("/goals", response_model=List[GoalResponse])
async def get_goals(child_id: Optional[str] = None, current_user: dict = Depends(get_current_user)):
    """Obtener todas las metas de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    query = {"family_id": current_user["family_id"]}
    if child_id:
        query["child_id"] = child_id
    
    goals = await db.goals.find(query).sort("created_at", -1).to_list(100)
    return [GoalResponse(**g) for g in goals]

@api_router.get("/goals/{goal_id}", response_model=GoalResponse)
async def get_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener una meta específica"""
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    return GoalResponse(**goal)

@api_router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(goal_id: str, goal_data: GoalUpdate, current_user: dict = Depends(get_current_user)):
    """Actualizar una meta"""
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    
    update_data = {k: v for k, v in goal_data.dict().items() if v is not None}
    if update_data:
        await db.goals.update_one({"id": goal_id}, {"$set": update_data})
    
    updated = await db.goals.find_one({"id": goal_id})
    return GoalResponse(**updated)

@api_router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Eliminar una meta"""
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    
    await db.goals.delete_one({"id": goal_id})
    return {"message": "Meta eliminada correctamente"}

@api_router.post("/goals/{goal_id}/pay-bonus", response_model=GoalResponse)
async def pay_goal_bonus(goal_id: str, current_user: dict = Depends(get_current_user)):
    """Pagar el bono de una meta completada"""
    goal = await db.goals.find_one({"id": goal_id, "family_id": current_user.get("family_id")})
    if not goal:
        raise HTTPException(status_code=404, detail="Meta no encontrada")
    
    if not goal["is_completed"]:
        raise HTTPException(status_code=400, detail="La meta aún no está completada")
    
    if goal["bonus_paid"]:
        raise HTTPException(status_code=400, detail="El bono ya fue pagado")
    
    # Add bonus to child's balance
    await db.children.update_one(
        {"id": goal["child_id"]},
        {"$inc": {"balance": goal["bonus_amount"]}}
    )
    
    # Mark bonus as paid
    await db.goals.update_one(
        {"id": goal_id},
        {"$set": {"bonus_paid": True}}
    )
    
    # Create payment record
    payment = {
        "id": str(uuid.uuid4()),
        "child_id": goal["child_id"],
        "chore_id": goal_id,
        "chore_title": f"Bono: {goal['title']}",
        "amount": goal["bonus_amount"],
        "status": "aprobado",
        "family_id": current_user["family_id"],
        "created_at": datetime.utcnow()
    }
    await db.payments.insert_one(payment)
    
    # Create notification
    child = await db.children.find_one({"id": goal["child_id"]})
    await create_notification(
        current_user["family_id"],
        "bonus_paid",
        "¡Bono pagado!",
        f"{child['name']} recibió un bono de {goal['bonus_amount']} por completar la meta '{goal['title']}'",
        goal["child_id"]
    )
    
    updated = await db.goals.find_one({"id": goal_id})
    return GoalResponse(**updated)

# ==================== NOTIFICATIONS ENDPOINTS ====================

async def create_notification(family_id: str, notif_type: str, title: str, message: str, child_id: Optional[str] = None):
    """Helper function to create notifications"""
    notification = {
        "id": str(uuid.uuid4()),
        "type": notif_type,
        "title": title,
        "message": message,
        "child_id": child_id,
        "is_read": False,
        "family_id": family_id,
        "created_at": datetime.utcnow()
    }
    await db.notifications.insert_one(notification)
    return notification

@api_router.get("/notifications", response_model=List[NotificationResponse])
async def get_notifications(unread_only: bool = False, current_user: dict = Depends(get_current_user)):
    """Obtener notificaciones de la familia"""
    if not current_user.get("family_id"):
        raise HTTPException(status_code=400, detail="No tienes una familia")
    
    query = {"family_id": current_user["family_id"]}
    if unread_only:
        query["is_read"] = False
    
    notifications = await db.notifications.find(query).sort("created_at", -1).to_list(100)
    return [NotificationResponse(**n) for n in notifications]

@api_router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, current_user: dict = Depends(get_current_user)):
    """Marcar notificación como leída"""
    await db.notifications.update_one(
        {"id": notification_id, "family_id": current_user.get("family_id")},
        {"$set": {"is_read": True}}
    )
    return {"message": "Notificación marcada como leída"}

@api_router.post("/notifications/read-all")
async def mark_all_notifications_read(current_user: dict = Depends(get_current_user)):
    """Marcar todas las notificaciones como leídas"""
    await db.notifications.update_many(
        {"family_id": current_user.get("family_id")},
        {"$set": {"is_read": True}}
    )
    return {"message": "Todas las notificaciones marcadas como leídas"}

@api_router.get("/notifications/count")
async def get_unread_count(current_user: dict = Depends(get_current_user)):
    """Obtener cantidad de notificaciones no leídas"""
    if not current_user.get("family_id"):
        return {"unread_count": 0}
    
    count = await db.notifications.count_documents({
        "family_id": current_user["family_id"],
        "is_read": False
    })
    return {"unread_count": count}

# ==================== ACHIEVEMENTS ENDPOINTS (LOGROS) ====================

ACHIEVEMENTS_DEFINITIONS = {
    "first_task": {"title": "Primera Tarea", "description": "Completaste tu primera tarea", "icon": "star"},
    "tasks_5": {"title": "Trabajador", "description": "Completaste 5 tareas", "icon": "medal"},
    "tasks_10": {"title": "Súper Trabajador", "description": "Completaste 10 tareas", "icon": "trophy"},
    "tasks_25": {"title": "Experto", "description": "Completaste 25 tareas", "icon": "ribbon"},
    "tasks_50": {"title": "Maestro", "description": "Completaste 50 tareas", "icon": "crown"},
    "streak_3": {"title": "Racha de 3", "description": "3 días consecutivos completando tareas", "icon": "flame"},
    "streak_7": {"title": "Racha Semanal", "description": "7 días consecutivos completando tareas", "icon": "flame"},
    "streak_14": {"title": "Racha de 2 Semanas", "description": "14 días consecutivos", "icon": "flame"},
    "streak_30": {"title": "Racha Mensual", "description": "30 días consecutivos completando tareas", "icon": "flame"},
    "goal_completed": {"title": "Meta Cumplida", "description": "Completaste tu primera meta", "icon": "flag"},
    "earned_100": {"title": "Primer Centenario", "description": "Ganaste 100 en total", "icon": "cash"},
    "earned_500": {"title": "Ahorrador", "description": "Ganaste 500 en total", "icon": "wallet"},
}

async def check_and_award_achievements(child_id: str, family_id: str):
    """Check and award achievements to a child"""
    child = await db.children.find_one({"id": child_id})
    if not child:
        return
    
    # Get existing achievements
    existing = await db.achievements.find({"child_id": child_id}).to_list(100)
    existing_types = [a["type"] for a in existing]
    
    # Count approved tasks
    task_count = await db.chores.count_documents({
        "completed_by": child_id,
        "status": "aprobada"
    })
    
    # Check task milestones
    task_milestones = [
        ("first_task", 1),
        ("tasks_5", 5),
        ("tasks_10", 10),
        ("tasks_25", 25),
        ("tasks_50", 50)
    ]
    
    for achievement_type, required in task_milestones:
        if task_count >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)
    
    # Check streak achievements
    streak = child.get("current_streak", 0)
    streak_milestones = [
        ("streak_3", 3),
        ("streak_7", 7),
        ("streak_14", 14),
        ("streak_30", 30)
    ]
    
    for achievement_type, required in streak_milestones:
        if streak >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)
    
    # Check earnings achievements
    total_earned = await db.payments.aggregate([
        {"$match": {"child_id": child_id}},
        {"$group": {"_id": None, "total": {"$sum": "$amount"}}}
    ]).to_list(1)
    
    total = total_earned[0]["total"] if total_earned else 0
    earning_milestones = [
        ("earned_100", 100),
        ("earned_500", 500)
    ]
    
    for achievement_type, required in earning_milestones:
        if total >= required and achievement_type not in existing_types:
            await award_achievement(child_id, family_id, achievement_type)

async def award_achievement(child_id: str, family_id: str, achievement_type: str):
    """Award an achievement to a child"""
    if achievement_type not in ACHIEVEMENTS_DEFINITIONS:
        return
    
    definition = ACHIEVEMENTS_DEFINITIONS[achievement_type]
    achievement = {
        "id": str(uuid.uuid4()),
        "type": achievement_type,
        "title": definition["title"],
        "description": definition["description"],
        "icon": definition["icon"],
        "child_id": child_id,
        "earned_at": datetime.utcnow()
    }
    await db.achievements.insert_one(achievement)
    
    # Create notification
    child = await db.children.find_one({"id": child_id})
    await create_notification(
        family_id,
        "achievement",
        f"¡Nuevo logro!",
        f"{child['name']} desbloqueó el logro '{definition['title']}'",
        child_id
    )

@api_router.get("/achievements/child/{child_id}", response_model=List[AchievementResponse])
async def get_child_achievements(child_id: str, current_user: dict = Depends(get_current_user)):
    """Obtener logros de un hijo"""
    child = await db.children.find_one({"id": child_id, "family_id": current_user.get("family_id")})
    if not child:
        raise HTTPException(status_code=404, detail="Hijo no encontrado")
    
    achievements = await db.achievements.find({"child_id": child_id}).sort("earned_at", -1).to_list(100)
    return [AchievementResponse(**a) for a in achievements]

@api_router.get("/achievements/definitions")
async def get_achievement_definitions():
    """Obtener todas las definiciones de logros"""
    return ACHIEVEMENTS_DEFINITIONS

# ==================== STREAK MANAGEMENT ====================

async def update_child_streak(child_id: str, family_id: str):
    """Update streak for a child when they complete a task"""
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
            # Already counted today
            return
        elif days_diff == 1:
            # Consecutive day
            current_streak += 1
        else:
            # Streak broken
            current_streak = 1
    else:
        current_streak = 1
    
    # Update best streak if needed
    if current_streak > best_streak:
        best_streak = current_streak
    
    await db.children.update_one(
        {"id": child_id},
        {
            "$set": {
                "last_task_date": datetime.utcnow(),
                "current_streak": current_streak,
                "best_streak": best_streak
            }
        }
    )
    
    # Check for achievements
    await check_and_award_achievements(child_id, family_id)

# ==================== ROOT ENDPOINT ====================

@api_router.get("/")
async def root():
    return {"message": "API de Tareas del Hogar", "version": "1.0"}

@api_router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Servidor funcionando correctamente"}

# Include the router in the main app
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
