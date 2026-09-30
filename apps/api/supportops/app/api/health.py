from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status": "ok",
        "service": "supportops-ai",
        "version": "0.1.0"
    }
