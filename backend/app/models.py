from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, EmailStr, Field


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    invite_code: Optional[str] = None
    device_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str
    device_name: Optional[str] = None


class PasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(..., min_length=4, max_length=128)


class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    role: str
    family_id: Optional[str] = None
    family_role: Optional[str] = None  # owner | parent | admin
    created_at: datetime


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FamilyCreate(BaseModel):
    name: str
    currency: str = "MXN"
    country_code: Optional[str] = Field(
        default=None,
        max_length=2,
        description="ISO 3166-1 alpha-2 (ej. MX, ES)",
    )


class FamilyResponse(BaseModel):
    id: str
    name: str
    currency: str
    owner_id: str
    created_at: datetime
    streak_bonus_amount: float = 0.0  # bono extra configurable por racha (opcional)
    savings_match_percent: float = 0.0  # % de match por ahorro semanal
    savings_match_weekly_cap: float = 0.0  # tope semanal por hijo
    family_challenge_target_percent: float = 15.0  # reto familiar mensual de ahorro (%)
    child_login_code: Optional[str] = None  # código para que los hijos entren solos en su vista
    country_code: Optional[str] = None
    notifications_enabled_for_parents: bool = True
    notifications_enabled_for_children: bool = True
    notifications_quiet_hours_start: Optional[int] = None  # 0-23
    notifications_quiet_hours_end: Optional[int] = None  # 0-23
    min_withdrawal_amount: float = 0.0
    max_withdrawal_amount: float = 0.0  # 0 => sin limite
    max_daily_withdrawal_per_child: float = 0.0  # 0 => sin limite
    demo_mode_enabled: bool = False
    auto_logout_minutes: int = 0  # 0 => desactivado
    permission_reset_activity_min_role: Literal["owner", "admin", "parent"] = "owner"
    permission_approve_withdrawals_min_role: Literal["owner", "admin", "parent"] = "parent"
    permission_edit_goals_min_role: Literal["owner", "admin", "parent"] = "parent"
    pin_failed_attempt_limit: int = 5
    pin_lockout_minutes: int = 15


class FamilyUpdate(BaseModel):
    name: Optional[str] = None
    currency: Optional[str] = None
    country_code: Optional[str] = Field(
        default=None,
        max_length=2,
        description="ISO 3166-1 alpha-2 o null para borrar",
    )
    savings_match_percent: Optional[float] = Field(default=None, ge=0, le=100)
    savings_match_weekly_cap: Optional[float] = Field(default=None, ge=0)
    family_challenge_target_percent: Optional[float] = Field(default=None, ge=0, le=100)
    streak_bonus_amount: Optional[float] = Field(default=None, ge=0)
    notifications_enabled_for_parents: Optional[bool] = None
    notifications_enabled_for_children: Optional[bool] = None
    notifications_quiet_hours_start: Optional[int] = Field(default=None, ge=0, le=23)
    notifications_quiet_hours_end: Optional[int] = Field(default=None, ge=0, le=23)
    min_withdrawal_amount: Optional[float] = Field(default=None, ge=0)
    max_withdrawal_amount: Optional[float] = Field(default=None, ge=0)
    max_daily_withdrawal_per_child: Optional[float] = Field(default=None, ge=0)
    demo_mode_enabled: Optional[bool] = None
    auto_logout_minutes: Optional[int] = Field(default=None, ge=0, le=1440)
    permission_reset_activity_min_role: Optional[Literal["owner", "admin", "parent"]] = None
    permission_approve_withdrawals_min_role: Optional[Literal["owner", "admin", "parent"]] = None
    permission_edit_goals_min_role: Optional[Literal["owner", "admin", "parent"]] = None
    pin_failed_attempt_limit: Optional[int] = Field(default=None, ge=3, le=10)
    pin_lockout_minutes: Optional[int] = Field(default=None, ge=1, le=120)


class FamilyPartialReset(BaseModel):
    chores: bool = True
    goals: bool = True
    savings_goals: bool = True
    payments: bool = True
    withdrawals: bool = True
    achievements: bool = True
    notifications: bool = True
    family_challenge_history: bool = True
    reset_children_balance_and_streaks: bool = True


class FamilyActivityRestoreRequest(BaseModel):
    backup: Dict[str, Any]
    apply: bool = False


ChildGender = Literal["mujer", "hombre"]


class ChildCreate(BaseModel):
    name: str
    age: int
    alias: Optional[str] = None
    pin: Optional[str] = None
    gender: Optional[ChildGender] = None


class ChildResponse(BaseModel):
    id: str
    name: str
    age: int
    alias: Optional[str] = None
    gender: Optional[ChildGender] = None
    balance: float
    family_id: str
    created_at: datetime
    savings_on_approve_percent: float = 0.0  # 0–100: parte del pago por tarea aprobada → meta de ahorro
    savings_on_approve_goal_id: Optional[str] = None  # meta preferida; si null, primera meta activa
    savings_current_streak: int = 0
    savings_best_streak: int = 0


class ChildFamilyBrief(BaseModel):
    id: str
    name: str
    currency: str


class ChildStandaloneLogin(BaseModel):
    family_code: str = Field(..., min_length=4, max_length=12)
    child_name: str = Field(..., min_length=1, max_length=80)
    pin: Optional[str] = Field(None, max_length=12)
    device_name: Optional[str] = Field(None, max_length=120)


class ChildPinChange(BaseModel):
    child_id: Optional[str] = None
    current_pin: Optional[str] = Field(None, max_length=12)
    new_pin: str = Field(..., min_length=4, max_length=12)


class ChildTokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    child: ChildResponse
    family: ChildFamilyBrief


class ChildUpdate(BaseModel):
    name: Optional[str] = None
    age: Optional[int] = None
    alias: Optional[str] = None
    pin: Optional[str] = None
    gender: Optional[ChildGender] = None
    savings_on_approve_percent: Optional[float] = Field(default=None, ge=0, le=100)
    savings_on_approve_goal_id: Optional[str] = None


class ChildLogin(BaseModel):
    child_id: str
    pin: Optional[str] = None


class ChoreCreate(BaseModel):
    title: str
    description: Optional[str] = None
    amount: float
    frequency: str = "unica"  # unica, diaria, semanal
    assigned_to: List[str] = []
    scheduled_date: Optional[str] = None  # ISO date (YYYY-MM-DD) para calendario
    consecutive_days: int = Field(
        1,
        ge=1,
        le=31,
        description="Crea una tarea por cada día consecutivo desde scheduled_date (requiere fecha si > 1)",
    )


class ChoreResponse(BaseModel):
    id: str
    title: str
    description: Optional[str] = None
    amount: float
    frequency: str
    assigned_to: List[str]
    status: str
    completed_by: Optional[str] = None
    completed_at: Optional[datetime] = None
    comment: Optional[str] = None
    family_id: str
    created_at: datetime
    scheduled_date: Optional[datetime] = None
    photo_url: Optional[str] = None  # URL o data URI corto
    rating: Optional[int] = None
    parent_feedback: Optional[str] = None
    quality_bonus: float = 0.0


class ChoreUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    amount: Optional[float] = None
    frequency: Optional[str] = None
    assigned_to: Optional[List[str]] = None
    scheduled_date: Optional[str] = None


class ChoreComplete(BaseModel):
    comment: Optional[str] = None
    photo_url: Optional[str] = None


class ChoreApprove(BaseModel):
    rating: Optional[int] = Field(None, ge=1, le=5)
    parent_feedback: Optional[str] = None
    quality_bonus: Optional[float] = Field(None, ge=0)
    # Opcionales: solo para este pago (si no se envían, se usa la regla del perfil del hijo)
    savings_percent: Optional[float] = Field(
        None,
        ge=0,
        le=100,
        description="Porcentaje del pago a la meta de ahorro (0 = todo al saldo)",
    )
    savings_amount: Optional[float] = Field(
        None,
        ge=0,
        description="Monto fijo a la meta; si se envía junto con savings_percent, prevalece el monto",
    )
    savings_goal_id: Optional[str] = Field(
        None,
        description="Meta destino; si no se envía, se usa la preferida del hijo o la primera activa",
    )
    savings_reason_note: Optional[str] = Field(
        None,
        max_length=240,
        description="Breve motivo de ahorro para esta aprobacion",
    )


class PaymentResponse(BaseModel):
    id: str
    child_id: str
    chore_id: str
    chore_title: str
    amount: float
    status: str
    created_at: datetime
    payment_type: str = "chore"  # chore | goal_bonus | withdrawal | quality_bonus
    purpose_note: Optional[str] = None  # para qué usaron el dinero (retiros)
    quality_bonus: float = 0.0
    withdrawal_id: Optional[str] = None
    savings_allocated: Optional[float] = None  # parte del pago enviada a meta de ahorro
    savings_goal_id: Optional[str] = None
    savings_reason_note: Optional[str] = None


class PaymentPurposeUpdate(BaseModel):
    purpose_note: str


class WithdrawalCreate(BaseModel):
    child_id: str
    amount: float
    note: Optional[str] = None
    purpose_type: Optional[Literal["necesidad", "deseo"]] = None
    goal_impact_note: Optional[str] = None


class WithdrawalResponse(BaseModel):
    id: str
    child_id: str
    amount: float
    status: str
    note: Optional[str] = None
    purpose_type: Optional[str] = None
    goal_impact_note: Optional[str] = None
    parent_note: Optional[str] = None
    family_id: str
    created_at: datetime
    resolved_at: Optional[datetime] = None


class WithdrawalResolve(BaseModel):
    parent_note: Optional[str] = None


class WithdrawalBulkApproveSmall(BaseModel):
    max_amount: float = Field(..., gt=0)
    parent_note: Optional[str] = None


class GoalCreate(BaseModel):
    title: str
    description: Optional[str] = None
    target_tasks: int
    bonus_amount: float
    child_id: str
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    goal_period: str = "personalizado"  # semanal | personalizado


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
    goal_period: str = "personalizado"


class GoalUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    target_tasks: Optional[int] = None
    bonus_amount: Optional[float] = None
    goal_period: Optional[str] = None


class SavingsGoalCreate(BaseModel):
    """Meta de ahorro: apartar dinero del saldo del hijo hacia un objetivo."""
    title: str = Field(..., min_length=1, max_length=120)
    note: Optional[str] = Field(default=None, max_length=500)
    target_amount: float = Field(..., gt=0)
    child_id: str


class SavingsGoalResponse(BaseModel):
    id: str
    title: str
    note: Optional[str] = None
    target_amount: float
    saved_amount: float
    child_id: str
    family_id: str
    created_at: datetime
    is_completed: bool
    milestones_reached: List[int] = []
    last_milestone_reached: Optional[int] = None


class SavingsGoalUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=120)
    note: Optional[str] = Field(default=None, max_length=500)
    target_amount: Optional[float] = Field(default=None, gt=0)


class SavingsTransferBody(BaseModel):
    amount: float = Field(..., gt=0)


class NotificationResponse(BaseModel):
    id: str
    type: str
    title: str
    message: str
    child_id: Optional[str] = None
    is_read: bool
    family_id: str
    created_at: datetime


class AchievementResponse(BaseModel):
    id: str
    type: str
    title: str
    description: str
    icon: str
    child_id: str
    earned_at: datetime
