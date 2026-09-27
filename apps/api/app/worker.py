import asyncio
import logging
import os
import sys
from temporalio.client import Client
from temporalio.worker import Worker

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler(sys.stdout)]
)
logger = logging.getLogger("support-ops-worker")

# Import Workflows and Activities
from app.workflows.support_workflow import SupportOpsWorkflow
from app.activities.support_activities import (
    triage_intent_activity,
    fetch_crm_customer_data,
    process_stripe_refund,
    update_crm_ticket_activity,
    notify_human_agent_activity,
)

TEMPORAL_HOST = os.getenv("TEMPORAL_HOST", "localhost:7233")
TASK_QUEUE = os.getenv("TEMPORAL_TASK_QUEUE", "support-ops-task-queue")

async def run_worker():
    logger.info(f"Connecting to Temporal cluster at {TEMPORAL_HOST}...")
    
    try:
        # Establish durable connection to Temporal server
        client = await Client.connect(TEMPORAL_HOST)
        logger.info("Successfully connected to Temporal server.")

        # Register workflows and activities with the worker thread pool
        worker = Worker(
            client,
            task_queue=TASK_QUEUE,
            workflows=[SupportOpsWorkflow],
            activities=[
                triage_intent_activity,
                fetch_crm_customer_data,
                process_stripe_refund,
                update_crm_ticket_activity,
                notify_human_agent_activity,
            ],
            # Maximum concurrent activities per worker instance to prevent rate-limit hits
            max_concurrent_activities=100,
            max_concurrent_workflow_tasks=100,
        )

        logger.info(f"SupportOps AI Worker active and listening on queue: [{TASK_QUEUE}]")
        
        # Run the worker until process receives interruption signal (SIGINT/SIGTERM)
        await worker.run()

    except asyncio.CancelledError:
        logger.info("Worker shutdown signal received. Gracefully terminating active tasks...")
    except Exception as e:
        logger.critical(f"Fatal error in worker process: {str(e)}", exc_info=True)
        sys.exit(1)

if __name__ == "__main__":
    try:
        asyncio.run(run_worker())
    except KeyboardInterrupt:
        logger.info("Worker process stopped manually.")