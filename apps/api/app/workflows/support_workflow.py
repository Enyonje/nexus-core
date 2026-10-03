from datetime import timedelta
from typing import List, Dict, Any
from temporalio import workflow
from temporalio.common import RetryPolicy

with workflow.unsafe.imports_passed_through():
    from app.activities.support_activities import (
        triage_intent_activity,
        fetch_crm_customer_data,
        process_stripe_refund,
        update_crm_ticket_activity,
        notify_human_agent_activity,
    )

@workflow.defn
class SupportOpsWorkflow:
    def __init__(self) -> None:
        self._logs: List[Dict[str, Any]] = []
        self._status: str = "INITIALIZING"

    @workflow.query
    def get_execution_logs(self) -> Dict[str, Any]:
        """Returns the current execution logs and workflow status."""
        return {
            "status": self._status,
            "logs": self._logs
        }

    def _append_log(self, step: str, state: str, detail: Any = None):
        self._logs.append({
            "step": step,
            "state": state,
            "detail": detail,
            "timestamp": workflow.now().isoformat()
        })

    @workflow.run
    async def run(self, payload: dict) -> dict:
        ticket_id = payload["ticket_id"]
        tenant_id = payload["tenant_id"]
        customer_query = payload["customer_query"]

        self._status = "RUNNING"
        self._append_log("00_START", "COMPLETED", "Workflow execution started")

        standard_retry = RetryPolicy(
            initial_interval=timedelta(seconds=2),
            backoff_coefficient=2.0,
            maximum_attempts=3
        )

        # Step 1: Intent Triage
        self._append_log("01_TRIAGE", "IN_PROGRESS", f"Analyzing intent for ticket {ticket_id}")
        triage_result = await workflow.execute_activity(
            triage_intent_activity,
            args=[customer_query],
            schedule_to_close_timeout=timedelta(seconds=15),
            retry_policy=standard_retry
        )
        self._append_log("01_TRIAGE", "COMPLETED", triage_result)

        # Step 2: Fetch CRM Context
        self._append_log("02_CRM_LOOKUP", "IN_PROGRESS", f"Retrieving records for {payload['customer_email']}")
        crm_data = await workflow.execute_activity(
            fetch_crm_customer_data,
            args=[payload["customer_email"], tenant_id],
            schedule_to_close_timeout=timedelta(seconds=10),
            retry_policy=standard_retry
        )
        self._append_log("02_CRM_LOOKUP", "COMPLETED", crm_data)

        # Step 3: Self-Healing / Action Execution
        intent = triage_result.get("intent")
        confidence = triage_result.get("confidence", 0.0)

        if intent == "REFUND_REQUEST" and confidence > 0.85:
            refund_amount = payload.get("requested_amount", 0.0)
            charge_id = crm_data.get("latest_charge_id")

            if charge_id and refund_amount > 0:
                self._append_log("03_STRIPE_REFUND", "IN_PROGRESS", f"Processing ${refund_amount} refund")
                refund_res = await workflow.execute_activity(
                    process_stripe_refund,
                    args=[charge_id, refund_amount, tenant_id],
                    schedule_to_close_timeout=timedelta(seconds=20),
                    retry_policy=standard_retry
                )
                self._append_log("03_STRIPE_REFUND", "COMPLETED", refund_res)

                if refund_res.get("success"):
                    self._status = "RESOLVED"
                    self._append_log("04_RESOLUTION", "COMPLETED", "Refund executed cleanly")
                    return {"status": "RESOLVED", "refund_id": refund_res["refund_id"]}

        # Step 4: Escalation Path
        self._append_log("03_ESCALATION", "IN_PROGRESS", "Escalating ticket to human team")
        await workflow.execute_activity(
            notify_human_agent_activity,
            args=[ticket_id, tenant_id, triage_result],
            schedule_to_close_timeout=timedelta(seconds=10)
        )
        self._status = "ESCALATED"
        self._append_log("04_RESOLUTION", "ESCALATED", "Human agent notified")

        return {"status": "ESCALATED", "reason": "Requires human review"}