from fastapi import APIRouter
from app.services.autonomous_brain import autonomous_brain_cycle

router = APIRouter(prefix="/brain", tags=["Autonomous Brain"])

@router.post("/run")
async def run_brain():
    return await autonomous_brain_cycle()
