import stripe
import os
from fastapi import APIRouter, Request, HTTPException, Header
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from sqlalchemy import text
from app.database import SessionLocal  # This will now work!

router = APIRouter()

# Securely load your keys from Environment Variables
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
endpoint_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

# Data model to handle incoming React requests
class CheckoutRequest(BaseModel):
    price_id: str
    customer_email: str

@router.post("/create-checkout-session")
async def create_checkout_session(request: CheckoutRequest):
    """
    Creates a secure Stripe checkout session.
    """
    try:
        checkout_session = stripe.checkout.Session.create(
            line_items=[{'price': request.price_id, 'quantity': 1}],
            mode='subscription',
            success_url=f"{os.getenv('FRONTEND_URL')}/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{os.getenv('FRONTEND_URL')}/cancel",
            customer_email=request.customer_email,
        )
        return {"url": checkout_session.url}
    except Exception as e:
        print(f"Stripe Error: {e}")
        raise HTTPException(status_code=500, detail="Checkout session creation failed")

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str = Header(None)):
    """
    Listens for successful payment events and updates the Database.
    """
    payload = await request.body()
    try:
        event = stripe.Webhook.construct_event(payload, stripe_signature, endpoint_secret)
    except Exception as e:
        return JSONResponse(content={"error": str(e)}, status_code=400)

    if event['type'] == 'checkout.session.completed':
        session = event['data']['object']
        customer_email = session.get("customer_email")
        
        async with SessionLocal() as db:
            try:
                query = text("UPDATE organizations SET is_active = :status WHERE email = :email")
                await db.execute(query, {"status": True, "email": customer_email})
                await db.commit()
                print(f"💰 Account Activated: {customer_email}")
            except Exception as db_err:
                print(f"❌ DB Error: {db_err}")

    return {"status": "success"}