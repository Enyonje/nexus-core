from fastapi import APIRouter, Depends, HTTPException
from app.realtime import manager  # Import the manager instance
from pydantic import BaseModel

router = APIRouter()

class TicketResolution(BaseModel):
    ticket_id: str
    resolution_status: str
    agent_name: str

@router.post("/resolve")
async def resolve_ticket(data: TicketResolution):
    # 1. Logic to update your Database would go here
    
    # 2. Trigger the Real-time Broadcast
    await manager.broadcast({
        "event": "TICKET_PROCESSED",
        "message": f"Agent {data.agent_name} resolved {data.ticket_id}",
        "status": data.resolution_status
    })
    
    return {"message": "Resolution broadcasted"}