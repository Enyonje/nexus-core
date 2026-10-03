from app.models.playbook import Playbook
from app.database import async_session
from app.services.actions import execute_actions

async def run_playbooks(incident: dict):
    async with async_session() as session:
        playbooks = await session.execute(
            Playbook.__table__.select().where(Playbook.enabled == True)
        )

        for playbook in playbooks.fetchall():
            trigger = playbook.trigger

            if trigger.get("type") != incident["type"]:
                continue

            if trigger.get("severity") and trigger["severity"] != incident["severity"]:
                continue

            await execute_actions(playbook.actions, incident)
