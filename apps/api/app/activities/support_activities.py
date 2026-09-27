import os
import stripe
from temporalio import activity

@activity.defn
async def triage_intent_activity(query: str) -> dict:
    activity.logger.info(f"Analyzing ticket query: {query}")
    query_lower = query.lower()
    
    if "refund" in query_lower or "money back" in query_lower:
        return {"intent": "REFUND_REQUEST", "confidence": 0.92}
    elif "cancel subscription" in query_lower:
        return {"intent": "CANCEL_SUBSCRIPTION", "confidence": 0.88}
    
    return {"intent": "GENERAL_INQUIRY", "confidence": 0.65}

@activity.defn
async def fetch_crm_customer_data(email: str, tenant_id: str) -> dict:
    activity.logger.info(f"Fetching CRM records for {email} on tenant {tenant_id}")
    # Replace with HubSpot/Zendesk API call
    return {
        "customer_id": "cust_99812",
        "latest_charge_id": "ch_3Mv1829018231",
        "subscription_status": "active"
    }

@activity.defn
async def process_stripe_refund(charge_id: str, amount: float, tenant_id: str) -> dict:
    activity.logger.info(f"Processing Stripe refund for charge {charge_id}")
    stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
    
    try:
        # Stripe idempotency key ensures 100% duplicate protection during retries
        refund = stripe.Refund.create(
            charge=charge_id,
            amount=int(amount * 100),
            idempotency_key=f"refund_{charge_id}"
        )
        return {"success": True, "refund_id": refund.id}
    except Exception as e:
        activity.logger.error(f"Stripe refund failed: {str(e)}")
        raise e

@activity.defn
async def update_crm_ticket_activity(ticket_id: str, status: str, resolution_note: str) -> bool:
    activity.logger.info(f"Updating ticket {ticket_id} to status {status}")
    return True

@activity.defn
async def notify_human_agent_activity(ticket_id: str, tenant_id: str, triage_data: dict) -> bool:
    activity.logger.info(f"Escalating ticket {ticket_id} to on-call support team")
    return True