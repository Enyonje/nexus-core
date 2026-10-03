from app.models.churn_prediction import ChurnPrediction
from app.database import async_session

def classify_risk(prob):
    if prob >= 0.7:
        return "High"
    elif prob >= 0.4:
        return "Medium"
    return "Low"

async def predict_churn(payload):
    """
    payload = {
      customer_id,
      tickets_last_30_days,
      avg_resolution_time,
      negative_sentiment_ratio,
      plan
    }
    """

    score = 0

    score += min(payload["tickets_last_30_days"] * 0.08, 0.4)
    score += min(payload["avg_resolution_time"] * 0.05, 0.3)
    score += payload["negative_sentiment_ratio"] * 0.3

    if payload["plan"] == "free":
        score += 0.15

    churn_probability = min(round(score, 2), 0.95)
    risk_level = classify_risk(churn_probability)

    prediction = ChurnPrediction(
        customer_id=payload["customer_id"],
        churn_probability=churn_probability,
        risk_level=risk_level,
        explanation="High ticket volume, slow resolution, negative sentiment"
    )

    async with async_session() as session:
        session.add(prediction)
        await session.commit()

    return prediction
