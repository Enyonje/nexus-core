import stripe
from fastapi import APIRouter, Depends
from app.core.config import settings
from app.core.security import get_current_user

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/billing", tags=["Billing"])

@router.post("/create-checkout-session")
def create_checkout_session(payload: dict, user=Depends(get_current_user)):
    price_id = payload.get("price_id")

    checkout_session = stripe.checkout.Session.create(
        mode="subscription",
        customer_email=user.email,
        line_items=[{"price": price_id, "quantity": 1}],
        success_url=f"{settings.FRONTEND_URL}/success",
        cancel_url=f"{settings.FRONTEND_URL}/cancel",
    )

    return {"checkout_url": checkout_session.url}
