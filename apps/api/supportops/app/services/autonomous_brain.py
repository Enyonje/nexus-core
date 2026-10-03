# app/services/autonomous_brain.py
from datetime import datetime
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import async_session


async def autonomous_brain_cycle():
    # ✅ Use async_session factory from app.database
    async with async_session() as session:  # session is an AsyncSession

        # 1. Observe system health
        stats = await session.execute(text("""
            SELECT
              COUNT(*) FILTER (WHERE resolved_by='AI') AS ai_resolved,
              COUNT(*) FILTER (WHERE resolved_by='Human') AS human_resolved,
              AVG(ai_confidence) AS avg_confidence
            FROM tickets
        """))

        ai_resolved, human_resolved, confidence = stats.first()
        total = (ai_resolved or 0) + (human_resolved or 0)

        ai_rate = (ai_resolved / max(total, 1)) * 100

        decisions: list[str] = []

        # 2. Decide optimizations
        if confidence and confidence < 0.75:
            decisions.append("Increase human review threshold")

        if ai_rate < 60:
            decisions.append("Retrain AI routing model")

        if ai_rate > 90:
            decisions.append("Enable aggressive auto-resolution")

        # 3. Log decisions
        for d in decisions:
            await session.execute(
                text("""
                    INSERT INTO ai_decisions (decision, created_at)
                    VALUES (:d, :ts)
                """),
                {"d": d, "ts": datetime.utcnow()}
            )

        await session.commit()

        return {
            "ai_resolution_rate": round(ai_rate, 2),
            "avg_confidence": round(confidence or 0, 2),
            "decisions": decisions,
        }