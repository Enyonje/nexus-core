from fastapi import APIRouter, Query
from app.services.revenue_forecast_service import generate_revenue_forecast

router = APIRouter(prefix="/revenue", tags=["Revenue Forecast"])

@router.get("/forecast")
async def forecast(months: int = Query(6, ge=3, le=12)):
    return await generate_revenue_forecast(months)
