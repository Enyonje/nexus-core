import stripe
from fastapi import APIRouter, Request
from app.core.config import settings

stripe.api_key = settings.STRIPE_SECRET_KEY

router = APIRouter(prefix="/billing", tags=["Billing"])

PRICE_IDS = {
    "starter": settings.STRIPE_PRICE_STARTER,
    "pro": settings.STRIPE_PRICE_PRO,
    "enterprise": settings.STRIPE_PRICE_ENTERPRISE,
}

@router.post("/create-checkout-session")
async def create_checkout_session(data: dict):
    plan = data.get("plan")

    session = stripe.checkout.Session.create(
        mode="subscription",
        line_items=[{
            "price": PRICE_IDS[plan],
            "quantity": 1,
        }],
        success_url=settings.FRONTEND_URL + "/success",
        cancel_url=settings.FRONTEND_URL + "/cancel",
    )

    return {"url": session.url}
