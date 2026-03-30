from fastapi import APIRouter

router = APIRouter(tags=["meta"])


@router.get("/")
async def root():
    return {"message": "API de HabitApp", "version": "1.0"}


@router.get("/health")
async def health_check():
    return {"status": "ok", "message": "Servidor funcionando correctamente"}
