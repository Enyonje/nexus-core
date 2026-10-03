from fastapi import APIRouter
from app.services.executive_metrics_service import get_executive_metrics

router = APIRouter(prefix="/executive", tags=["Executive"])

@router.get("/overview")
async def overview():
    return await get_executive_metrics()
