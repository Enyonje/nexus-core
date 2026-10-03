from fastapi import APIRouter, Depends
from app.core.dependencies import require_feature
from app.models.user import User

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/dashboard")
def analytics_dashboard(
    user: User = Depends(require_feature("analytics")),
):
    return {
        "mrr": 2480,
        "customers": 31,
        "ai_resolution_rate": "67%",
        "requested_by": user.email,
        "plan": user.plan,
    }
