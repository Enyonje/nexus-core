from datetime import timedelta
from temporalio import workflow

with workflow.unsafe.imports_passed_through():
    from app.agents.intent_agent import classify_intent_activity
    from app.integrations.stripe_service import process_stripe_refund
    from app.audit.logger import log_escalation_activity, log_final_success_activity

@workflow.def_name("SupportTicketWorkflow")
class SupportTicketWorkflow:
    def __init__(self):
        self._approval_received = False

    @workflow.signal
    def human_approval_signal(self, approved: bool):
        self._approval_received = approved

    @workflow.run
    async def run(self, ticket_data: dict):
        # 1. AI Classification Activity
        classification = await workflow.execute_activity(
            classify_intent_activity,
            ticket_data,
            start_to_close_timeout=timedelta(seconds=30),
        )

        # 2. Logic for Refund Path
        if classification["intent"] == "refund_request":
            # Wait for signal OR 24-hour SLA timeout
            reached_condition = await workflow.wait_condition(
                lambda: self._approval_received,
                timeout=timedelta(hours=24)
            )

            if reached_condition:
                # 3. Execution: Stripe Refund Activity
                refund_result = await workflow.execute_activity(
                    process_stripe_refund,
                    {"ticket_id": ticket_data["id"], "charge_id": "ch_mock_123"},
                    start_to_close_timeout=timedelta(minutes=2),
                    retry_policy=workflow.RetryPolicy(initial_interval=timedelta(seconds=5))
                )
                
                # 4. Final Success Audit
                await workflow.execute_activity(
                    log_final_success_activity,
                    {"ticket_id": ticket_data["id"], "payload": refund_result},
                    start_to_close_timeout=timedelta(seconds=5)
                )
            else:
                # 5. SLA Breach Path
                await workflow.execute_activity(
                    log_escalation_activity,
                    {"ticket_id": ticket_data["id"], "reason": "SLA Timed Out"},
                    start_to_close_timeout=timedelta(seconds=10)
                )
        
        return {"status": "completed", "classification": classification}