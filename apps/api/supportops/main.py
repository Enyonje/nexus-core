import asyncio
import json
import logging
import random
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from typing import AsyncGenerator, Optional

from fastapi import FastAPI, HTTPException, Query, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
from sse_starlette.sse import EventSourceResponse

# Setup logger
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("supportops.engine")


# ==========================================
# Lifespan Context Manager
# ==========================================
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifecycle manager for database initialization and background workers."""
    logger.info("Initializing SupportOps Swarm Engine & Worker Pipelines...")
    # Add startup tasks (e.g., DB pool init, Redis connection) here
    yield
    logger.info("Shutting down SupportOps services gracefully...")
    # Add teardown tasks here


# ==========================================
# FastAPI Application Config
# ==========================================
app = FastAPI(
    title="SupportOps AI Engine API",
    description="Autonomous Agent Swarms & Customer Support Automation Engine",
    version="2.4.0-production",
    lifespan=lifespan,
)

# CORS configuration to allow local Vite/Next.js frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==========================================
# Pydantic Schemas
# ==========================================
class HealthResponse(BaseModel):
    status: str = Field(..., example="operational")
    uptime: str = Field(..., example="99.98%")
    aiEngine: str = Field(..., example="Operational")
    orchestrator: str = Field(..., example="Stable")
    apiLatencyMs: int = Field(..., example=118)
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class MetricsResponse(BaseModel):
    mrr: float = Field(..., example=42850.0)
    mrrChange: str = Field(..., example="+12.4%")
    customers: int = Field(..., example=1240)
    customersChange: str = Field(..., example="+18")
    tickets: int = Field(..., example=8420)
    ticketsChange: str = Field(..., example="+24%")
    aiResolutionRate: float = Field(..., example=88.5)
    aiResolutionRateChange: str = Field(..., example="+3.2%")
    timeframe: str = Field(..., example="30d")


class AgentRuleRequest(BaseModel):
    name: str = Field(..., example="Auto-refund under $50")
    agentType: str = Field(..., example="RefundAgent")
    triggerCondition: str = Field(..., example="ticket.category == 'refund' and ticket.amount < 50")
    action: str = Field(..., example="approve_and_close")


# ==========================================
# API Routes
# ==========================================

@app.get("/", tags=["Root"])
async def root():
    return {
        "service": "SupportOps AI Engine",
        "version": "2.4.0-production",
        "status": "running",
        "docs": "/docs",
    }


@app.get(
    "/api/v1/system/health",
    response_model=HealthResponse,
    tags=["System Telemetry"],
)
async def get_system_health():
    """Returns operational health and latency telemetry across core microservices."""
    return HealthResponse(
        status="healthy",
        uptime="99.98%",
        aiEngine="Operational",
        orchestrator="Stable",
        apiLatencyMs=random.randint(95, 140),
    )


@app.get(
    "/api/v1/dashboard/metrics",
    response_model=MetricsResponse,
    tags=["Metrics & Analytics"],
)
async def get_dashboard_metrics(
    timeframe: Optional[str] = Query("30d", regex="^(7d|30d|90d)$")
):
    """Retrieves aggregated KPI metrics based on selected timeframe."""
    # Scale synthetic response values according to chosen window
    multiplier = {"7d": 0.25, "30d": 1.0, "90d": 2.8}.get(timeframe, 1.0)

    return MetricsResponse(
        mrr=42850.0,
        mrrChange="+12.4%",
        customers=1240,
        customersChange="+18",
        tickets=int(8420 * multiplier),
        ticketsChange="+24%",
        aiResolutionRate=88.5,
        aiResolutionRateChange="+3.2%",
        timeframe=timeframe,
    )


@app.get("/api/v1/agents/activity/stream", tags=["Swarm Activity SSE"])
async def stream_agent_activity(request: Request):
    """Server-Sent Events (SSE) stream delivering real-time agent execution events to the frontend dashboard."""

    async def event_generator() -> AsyncGenerator[dict, None]:
        agent_types = [
            "TriageAgent",
            "BillingAgent",
            "EscalationAgent",
            "ResolutionAgent",
            "SentimentAnalyzer",
        ]
        actions = [
            "Analyzed customer intent and categorized as Priority Tier 1",
            "Auto-resolved password reset request via SSO protocol",
            "Processed tier-2 refund authorization and dispatched Stripe event",
            "Escalated sensitive enterprise SLA ticket to human ops manager",
            "Generated AI response draft using Claude 3.5 Sonnet router",
        ]

        event_id = 1
        while True:
            # Check if the client disconnected
            if await request.is_disconnected():
                logger.info("SSE client disconnected.")
                break

            data = {
                "id": f"evt-{event_id}",
                "description": random.choice(actions),
                "agentType": random.choice(agent_types),
                "timestamp": datetime.now(timezone.utc).isoformat(),
            }

            yield {
                "event": "message",
                "id": str(event_id),
                "data": json.dumps(data),
            }

            event_id += 1
            await asyncio.sleep(random.uniform(2.5, 5.0))  # Emit every 2.5–5 seconds

    return EventSourceResponse(event_generator())


@app.post("/api/v1/agents/rules", status_code=status.HTTP_201_CREATED, tags=["Agent Management"])
async def deploy_agent_rule(rule: AgentRuleRequest):
    """Deploys a new autonomous agent rule to the workflow orchestrator."""
    logger.info(f"Deploying agent rule: {rule.name} [{rule.agentType}]")
    return {
        "status": "success",
        "message": f"Rule '{rule.name}' successfully deployed to Nexus Swarm.",
        "rule_id": f"rule-{random.randint(1000, 9999)}",
    }


# ==========================================
# Exception Handlers
# ==========================================
@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(
        status_code=exc.status_code,
        content={"error": True, "detail": exc.detail, "path": request.url.path},
    )


# ==========================================
# Application Entry Point
# ==========================================
if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)