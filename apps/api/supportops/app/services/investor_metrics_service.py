from app.database import async_session
from sqlalchemy import text

async def get_investor_metrics():
    async with async_session() as session:

        mrr = await session.execute(text("""
            SELECT COALESCE(SUM(mrr), 0) FROM customers
        """))

        churn = await session.execute(text("""
            SELECT COALESCE(AVG(churn_probability), 0.05)
            FROM churn_predictions
        """))

        customers = await session.execute(text("""
            SELECT COUNT(*) FROM customers
        """))

        ai_resolved = await session.execute(text("""
            SELECT COUNT(*) FROM tickets WHERE resolved_by = 'AI'
        """))

        human_resolved = await session.execute(text("""
            SELECT COUNT(*) FROM tickets WHERE resolved_by = 'Human'
        """))

        cac = 120
        ltv = float(mrr.scalar()) * 24

        return {
            "mrr": round(float(mrr.scalar()), 2),
            "arr": round(float(mrr.scalar()) * 12, 2),
            "churn_rate": round(float(churn.scalar()) * 100, 2),
            "customer_count": customers.scalar(),
            "net_revenue_retention": round(100 - (float(churn.scalar()) * 100), 2),
            "ltv": round(ltv, 2),
            "cac": cac,
            "ltv_cac_ratio": round(ltv / cac, 2),
            "ai_resolution_rate": round(
                ai_resolved.scalar() /
                max(ai_resolved.scalar() + human_resolved.scalar(), 1) * 100, 2
            )
        }
