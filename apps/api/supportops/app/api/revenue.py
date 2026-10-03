from fastapi import APIRouter
from app.services.revenue_impact_service import calculate_revenue_impact

router = APIRouter(prefix="/revenue", tags=["Revenue Attribution"])

@router.post("/calculate")
async def calculate(payload: dict):
    return await calculate_revenue_impact(payload)
