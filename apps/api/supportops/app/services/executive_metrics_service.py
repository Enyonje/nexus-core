from app.database import async_session
from sqlalchemy import text

async def get_executive_metrics():
    async with async_session() as session:

        revenue_at_risk = await session.execute(text("""
            SELECT COALESCE(SUM(mrr), 0)
            FROM churn_predictions
            WHERE churn_probability > 0.7
        """))

        health_distribution = await session.execute(text("""
            SELECT status, COUNT(*) 
            FROM customer_health
            GROUP BY status
        """))

        open_tickets = await session.execute(text("""
            SELECT COUNT(*) FROM tickets WHERE status != 'Resolved'
        """))

        auto_resolved = await session.execute(text("""
            SELECT COUNT(*) FROM tickets WHERE resolved_by = 'AI'
        """))

        critical_customers = await session.execute(text("""
            SELECT customer_id, health_score
            FROM customer_health
            WHERE status = 'Critical'
            ORDER BY health_score ASC
            LIMIT 5
        """))

        return {
            "revenue_at_risk": revenue_at_risk.scalar(),
            "health_distribution": [
                {"status": r[0], "count": r[1]} for r in health_distribution.fetchall()
            ],
            "open_tickets": open_tickets.scalar(),
            "ai_resolutions": auto_resolved.scalar(),
            "critical_customers": [
                {"customer_id": r[0], "health_score": r[1]} for r in critical_customers.fetchall()
            ]
        }
