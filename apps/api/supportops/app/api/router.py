from fastapi import APIRouter
from app.routes import auth, users, billing, webhooks
from app.api import autonomous_brain, investor_metrics, revenue_forecast

api_router = APIRouter()

# ✅ Prefix and tags for clarity and route grouping
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(users.router, prefix="/users", tags=["users"])
api_router.include_router(billing.router, prefix="/billing", tags=["billing"])
api_router.include_router(webhooks.router, prefix="/webhooks", tags=["webhooks"])
api_router.include_router(autonomous_brain.router, prefix="/brain", tags=["autonomous_brain"])
api_router.include_router(investor_metrics.router, prefix="/metrics", tags=["investor_metrics"])
api_router.include_router(revenue_forecast.router, prefix="/forecast", tags=["revenue_forecast"])