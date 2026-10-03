from fastapi import APIRouter, HTTPException, Depends, Header
from pydantic import BaseModel, EmailStr
from temporalio.client import Client
import os

router = APIRouter(prefix="/api/v1/support-ops", tags=["SupportOps AI"])

class TicketIngestRequest(BaseModel):
    ticket_id: str
    customer_email: EmailStr
    customer_query: str
    requested_amount: float = 0.0

@router.post("/process-ticket")
async def process_ticket(
    payload: TicketIngestRequest,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    temporal_host = os.getenv("TEMPORAL_HOST", "localhost:7233")
    
    try:
        # Connect to Temporal Server
        client = await Client.connect(temporal_host)

        # Trigger workflow asynchronously with durable state guarantees
        workflow_id = f"support-ticket-{payload.ticket_id}"
        
        handle = await client.start_workflow(
            "SupportOpsWorkflow",
            {
                "ticket_id": payload.ticket_id,
                "tenant_id": x_tenant_id,
                "customer_email": payload.customer_email,
                "customer_query": payload.customer_query,
                "requested_amount": payload.requested_amount,
            },
            id=workflow_id,
            task_queue="support-ops-task-queue"
        )

        return {
            "status": "QUEUED",
            "message": "SupportOps workflow initiated with 100% state persistence.",
            "workflow_id": handle.id,
            "run_id": handle.result_run_id
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start workflow: {str(e)}")