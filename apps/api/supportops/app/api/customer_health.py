from fastapi import APIRouter
from app.services.customer_health_service import calculate_health

router = APIRouter(prefix="/health-score", tags=["Customer Health"])

@router.post("/calculate")
async def calculate(payload: dict):
    return await calculate_health(payload)
