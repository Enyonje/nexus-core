from app.ai.rca_engine import generate_rca
from app.models.rca_report import RCAReport
from app.database import async_session

async def run_rca(ticket, historical_tickets, tenant_id):
    result = generate_rca(ticket, historical_tickets)

    async with async_session() as session:
        report = RCAReport(
            ticket_id=ticket["id"],
            tenant_id=tenant_id,
            root_cause=result["root_cause"],
            confidence=result["confidence"],
            suggested_fix=result["suggested_fix"],
            contributing_factors=result["contributing_factors"],
        )
        session.add(report)
        await session.commit()

    return report
