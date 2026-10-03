from app.models.auto_remediation import AutoRemediationRule
from app.database import async_session

CONFIDENCE_THRESHOLD = 0.85

async def analyze_ticket_for_remediation(ticket_text: str):
    async with async_session() as session:
        rules = (
            await session.execute(AutoRemediationRule.__table__.select())
        ).all()

        for rule in rules:
            rule = rule[0]
            if rule.trigger_keyword.lower() in ticket_text.lower():
                return {
                    "matched": True,
                    "action": rule.remediation_action,
                    "confidence": rule.confidence_score,
                    "auto_apply": rule.auto_apply and rule.confidence_score >= CONFIDENCE_THRESHOLD
                }

    return {
        "matched": False,
        "confidence": 0.0
    }
