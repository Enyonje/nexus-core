from fastapi import Depends, HTTPException, status
from app.core.security import get_current_user
from app.core.plans import PLAN_FEATURES
from app.models.user import User


def require_feature(feature: str):
    def checker(user: User = Depends(get_current_user)):
        plan = user.plan

        if plan not in PLAN_FEATURES:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid subscription plan",
            )

        if not PLAN_FEATURES[plan].get(feature, False):
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=f"Upgrade plan to access '{feature}'",
            )

        return user

    return checker
