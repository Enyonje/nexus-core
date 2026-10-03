from app.models.revenue_impact import RevenueImpact
from app.database import async_session

ENGINEER_COST_PER_HOUR = 60
AVG_RESOLUTION_HOURS = 2.5

async def calculate_revenue_impact(ticket):
    """
    ticket = {
        id,
        priority,
        customer_plan,
        ai_resolved (bool)
    }
    """

    estimated_loss = 0
    if ticket["priority"] == "Urgent":
        estimated_loss = 1200
    elif ticket["priority"] == "High":
        estimated_loss = 600
    else:
        estimated_loss = 200

    manual_cost_saved = ENGINEER_COST_PER_HOUR * AVG_RESOLUTION_HOURS
    ai_prevented_loss = estimated_loss if ticket["ai_resolved"] else 0

    impact = RevenueImpact(
        ticket_id=ticket["id"],
        estimated_loss=estimated_loss,
        ai_prevented_loss=ai_prevented_loss,
        manual_cost_saved=manual_cost_saved,
        attribution_reason="AI auto-resolution prevented churn & manual workload"
    )

    async with async_session() as session:
        session.add(impact)
        await session.commit()

    return impact
