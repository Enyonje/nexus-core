import asyncio
import os
from temporalio.client import Client
from temporalio.worker import Worker

from app.orchestration.workflows import SupportTicketWorkflow
from app.agents.intent_agent import classify_intent_activity
from app.integrations.stripe_service import process_stripe_refund
from app.audit.logger import log_escalation_activity, log_final_success_activity

async def main():
    # Connect to the Temporal server running in Docker
    client = await Client.connect(os.getenv("TEMPORAL_HOST", "localhost:7233"))

    worker = Worker(
        client,
        task_queue="support-tasks",
        workflows=[SupportTicketWorkflow],
        activities=[
            classify_intent_activity,
            process_stripe_refund,
            log_escalation_activity,
            log_final_success_activity
        ],
    )
    
    print("🚀 Worker is online. Monitoring queues...")
    await worker.run()

if __name__ == "__main__":
    asyncio.run(main())