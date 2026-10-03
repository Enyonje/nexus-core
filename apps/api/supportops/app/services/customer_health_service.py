from app.models.customer_health import CustomerHealth
from app.database import async_session

def health_status(score: int):
    if score >= 75:
        return "Healthy"
    if score >= 45:
        return "At Risk"
    return "Critical"

async def calculate_health(payload):
    """
    payload = {
      customer_id,
      churn_probability,
      tickets_last_30_days,
      avg_resolution_time,
      sentiment_score,
      plan
    }
    """

    score = 100

    score -= int(payload["churn_probability"] * 50)
    score -= payload["tickets_last_30_days"] * 3
    score -= int(payload["avg_resolution_time"] * 4)
    score += int(payload["sentiment_score"] * 10)

    if payload["plan"] == "free":
        score -= 10

    score = max(5, min(score, 100))
    status = health_status(score)

    health = CustomerHealth(
        customer_id=payload["customer_id"],
        health_score=score,
        status=status,
        summary="AI-evaluated health using churn risk, behavior & sentiment"
    )

    async with async_session() as session:
        session.add(health)
        await session.commit()

    return health
