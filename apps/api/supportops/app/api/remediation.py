from fastapi import APIRouter
from app.services.auto_remediation_service import analyze_ticket_for_remediation

router = APIRouter(prefix="/remediation", tags=["Auto-Remediation"])

@router.post("/analyze")
async def analyze_ticket(payload: dict):
    ticket_text = payload.get("text", "")
    return await analyze_ticket_for_remediation(ticket_text)
