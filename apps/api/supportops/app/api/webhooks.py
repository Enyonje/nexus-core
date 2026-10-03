from fastapi import APIRouter, Request
import stripe
from app.core.config import settings

router = APIRouter()

stripe.api_key = settings.STRIPE_SECRET_KEY

@router.post("/stripe/webhook")
async def stripe_webhook(request: Request):
    payload = await request.body()
    sig = request.headers.get("stripe-signature")

    event = stripe.Webhook.construct_event(
        payload, sig, settings.STRIPE_WEBHOOK_SECRET
    )

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # mark user as paid, assign plan

    return {"status": "ok"}
