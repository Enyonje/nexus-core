import os
import asyncio
from temporalio.client import Client

temporal_client = None

async def get_client():
    global temporal_client

    if temporal_client:
        return temporal_client

    temporal_host = os.getenv("TEMPORAL_HOST", "temporal:7233")

    for attempt in range(10):
        try:
            print(f"⏳ Connecting to Temporal ({temporal_host})... attempt {attempt+1}")
            temporal_client = await Client.connect(temporal_host)
            print("✅ Connected to Temporal")
            return temporal_client
        except Exception as e:
            print(f"⚠️ Temporal not ready: {e}")
            await asyncio.sleep(3)

    print("❌ Temporal unavailable, continuing without it")
    return None
