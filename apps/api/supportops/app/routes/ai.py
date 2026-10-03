from fastapi import APIRouter, Depends
from app.core.dependencies import require_feature
from app.models.user import User

router = APIRouter(prefix="/ai", tags=["AI"])


@router.post("/respond")
def ai_respond(
    user: User = Depends(require_feature("ai_responses")),
):
    return {
        "status": "success",
        "message": "AI handled this ticket",
        "user": user.email,
    }
