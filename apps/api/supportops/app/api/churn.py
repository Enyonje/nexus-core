from fastapi import APIRouter
from app.services.churn_prediction_service import predict_churn

router = APIRouter(prefix="/churn", tags=["Churn Prediction"])

@router.post("/predict")
async def predict(payload: dict):
    return await predict_churn(payload)
