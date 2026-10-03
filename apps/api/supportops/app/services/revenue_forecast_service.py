from app.database import async_session
from sqlalchemy import text

async def generate_revenue_forecast(months: int = 6):
    async with async_session() as session:

        current_mrr = await session.execute(text("""
            SELECT COALESCE(SUM(mrr), 0) FROM customers
        """))

        churn_rate = await session.execute(text("""
            SELECT COALESCE(AVG(churn_probability), 0.05)
            FROM churn_predictions
        """))

        ai_savings = await session.execute(text("""
            SELECT COUNT(*) * 35
            FROM tickets
            WHERE resolved_by = 'AI'
        """))

        base_mrr = float(current_mrr.scalar())
        churn = float(churn_rate.scalar())
        savings = float(ai_savings.scalar())

        forecast = []
        projected_mrr = base_mrr

        for month in range(1, months + 1):
            projected_mrr = projected_mrr * (1 - churn)
            forecast.append({
                "month": month,
                "base_case": round(projected_mrr + savings, 2),
                "optimistic": round(projected_mrr * 1.1 + savings, 2),
                "worst_case": round(projected_mrr * 0.85, 2)
            })

        return {
            "current_mrr": base_mrr,
            "ai_savings_monthly": savings,
            "forecast": forecast
        }
