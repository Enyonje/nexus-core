from fastapi import APIRouter
from app.services.investor_metrics_service import get_investor_metrics

router = APIRouter(prefix="/investors", tags=["Investor Metrics"])

@router.get("/metrics")
async def metrics():
    return await get_investor_metrics()
