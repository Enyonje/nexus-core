from fastapi import APIRouter
from app.services.rca_service import run_rca

router = APIRouter(prefix="/rca", tags=["Root Cause Analysis"])

@router.post("/{ticket_id}")
async def generate_rca_for_ticket(ticket_id: str):
    # Temporary mock ticket + history
    ticket = {"id": ticket_id, "error_code": "AUTH_401"}
    historical = [
        {"error_code": "AUTH_401"},
        {"error_code": "AUTH_401"},
        {"error_code": "TIMEOUT_504"},
    ]

    report = await run_rca(ticket, historical, tenant_id="demo-tenant")
    return report
