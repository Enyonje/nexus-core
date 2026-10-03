from fastapi import APIRouter, Depends
from sqlmodel import Session, select
from typing import List

from app.database import get_session
from app.models.user import User, UserCreate, UserRead
from app.core.security import hash_password
from app.core.deps import require_role

router = APIRouter(prefix="/api/v1/users", tags=["Users"])

@router.get("/", response_model=List[UserRead])
def list_users(
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin"))
):
    users = session.exec(select(User)).all()
    return users

@router.post("/", response_model=UserRead)
def create_user(
    payload: UserCreate,
    session: Session = Depends(get_session),
    _: User = Depends(require_role("admin"))
):
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        plan=payload.plan,
    )
    session.add(user)
    session.commit()
    session.refresh(user)
    return user