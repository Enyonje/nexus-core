import httpx

async def execute_actions(actions: list, incident: dict):
    for action in actions:
        if action["type"] == "slack":
            await send_slack(action, incident)

        if action["type"] == "ticket_update":
            await update_ticket(action, incident)

async def send_slack(action, incident):
    async with httpx.AsyncClient() as client:
        await client.post(
            action["webhook"],
            json={
                "text": f"🚨 Incident: {incident['title']} (Severity {incident['severity']})"
            }
        )

async def update_ticket(action, incident):
    # Placeholder for internal ticket update
    print(f"Updating ticket {incident['id']} → {action['status']}")
