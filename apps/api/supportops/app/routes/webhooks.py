import stripe
from fastapi import APIRouter, Depends, Header, HTTPException, Request
from sqlmodel import Session

from app.core.config import settings
from app.db.session import get_session

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])

stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe")
async def stripe_webhook(
    request: Request,
    stripe_signature: str = Header(None, alias="Stripe-Signature"),
    session: Session = Depends(get_session),
):
    payload = await request.body()

    try:
        event = stripe.Webhook.construct_event(
            payload=payload,
            sig_header=stripe_signature,
            secret=settings.STRIPE_WEBHOOK_SECRET,
        )
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid Stripe signature")
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")

    # ============================
    # Handle events
    # ============================

    if event["type"] == "checkout.session.completed":
        session_data = event["data"]["object"]

        # TODO:
        # - mark subscription active
        # - link stripe_customer_id
        # - persist plan

        print("✅ Stripe checkout completed:", session_data["id"])

    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        print("❌ Subscription canceled:", subscription["id"])

    return {"status": "success"}
