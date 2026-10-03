import asyncio
import json
import os
from fastapi import APIRouter, HTTPException, Header
from fastapi.responses import StreamingResponse
from temporalio.client import Client

router = APIRouter(prefix="/api/v1/stream", tags=["SSE Streaming"])

TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "localhost:7233")

@router.get("/workflow/{workflow_id}")
async def stream_workflow_execution(
    workflow_id: str,
    x_tenant_id: str = Header(..., alias="X-Tenant-ID")
):
    """
    Streams live workflow execution logs via Server-Sent Events (SSE).
    """
    async def event_generator():
        try:
            client = await Client.connect(TEMPORAL_HOST)
            handle = client.get_workflow_handle(workflow_id)

            last_log_count = 0

            while True:
                # Query workflow state
                state = await handle.query("get_execution_logs")
                logs = state.get("logs", [])
                status = state.get("status", "UNKNOWN")

                # Emit new logs if available
                if len(logs) > last_log_count:
                    new_logs = logs[last_log_count:]
                    last_log_count = len(logs)

                    for item in new_logs:
                        data = json.dumps({
                            "workflow_id": workflow_id,
                            "overall_status": status,
                            "log": item
                        })
                        yield f"data: {data}\n\n"

                # Terminal condition check
                if status in ["RESOLVED", "ESCALATED", "FAILED", "COMPLETED"]:
                    done_event = json.dumps({
                        "workflow_id": workflow_id,
                        "overall_status": status,
                        "event": "DONE"
                    })
                    yield f"data: {done_event}\n\n"
                    break

                await asyncio.sleep(0.5)

        except Exception as e:
            error_data = json.dumps({"error": str(e)})
            yield f"data: {error_data}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no" # Disable NGINX/Vercel buffering
        }
    )