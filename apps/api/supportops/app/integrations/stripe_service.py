import stripe
import os
from temporalio import activity

# Set your key via env var
stripe.api_key = os.getenv("STRIPE_API_KEY")

@activity.defn
async def process_stripe_refund(data: dict) -> dict:
    ticket_id = data.get("ticket_id")
    charge_id = data.get("charge_id")

    try:
        # In a real scenario, this performs the actual money movement
        refund = stripe.Refund.create(
            charge=charge_id,
            metadata={"ticket_id": ticket_id}
        )
        return {
            "status": "success",
            "refund_id": refund.id,
            "amount": refund.amount
        }
    except stripe.error.StripeError as e:
        # Log error and raise for Temporal to retry
        activity.logger.error(f"Stripe Error: {str(e)}")
        raise e