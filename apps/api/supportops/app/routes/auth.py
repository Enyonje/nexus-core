import logging
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from jose import JWTError, jwt
from pydantic import BaseModel

from app.database import get_session
from app.models.user import User
from app.core.security import verify_password, hash_password
from app.core.jwt import create_access_token

logger = logging.getLogger(__name__)

router = APIRouter(tags=["auth"])

# Use OAuth2PasswordBearer for JWT extraction
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET_KEY = "your-secret-key"  # ⚠️ Move to env variable
ALGORITHM = "HS256"

# ---------------------------
# Schemas
# ---------------------------
class RegisterRequest(BaseModel):
    email: str
    password: str
    name: str

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    email: str
    name: str

# ---------------------------
# Helpers
# ---------------------------
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    session: AsyncSession = Depends(get_session)
):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid token")

        result = await session.execute(select(User).where(User.id == int(user_id)))
        user = result.scalar_one_or_none()
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

def get_admin_user(current_user: User = Depends(get_current_user)):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Not enough permissions")
    return current_user

# ---------------------------
# Auth Endpoints
# ---------------------------
@router.post("/login", response_model=AuthResponse)
async def login(
    form: OAuth2PasswordRequestForm = Depends(),
    session: AsyncSession = Depends(get_session)
):
    logger.info("Login attempt for user=%s", form.username)
    result = await session.execute(select(User).where(User.email == form.username))
    user = result.scalar_one_or_none()

    if not user or not verify_password(form.password, user.hashed_password):
        logger.warning("Invalid login for user=%s", form.username)
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id), "role": user.role})
    return AuthResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        name=user.name,
    )

@router.post("/register", response_model=AuthResponse)
async def register(
    payload: RegisterRequest,
    session: AsyncSession = Depends(get_session)
):
    logger.info("Register endpoint hit with email=%s", payload.email)

    result = await session.execute(select(User).where(User.email == payload.email))
    existing_user = result.scalar_one_or_none()
    if existing_user:
        logger.warning("Registration failed: email already exists (%s)", payload.email)
        raise HTTPException(status_code=400, detail="Email already exists")

    user = User(
        email=payload.email,
        name=payload.name,
        hashed_password=hash_password(payload.password),
        role="agent"  # default role
    )
    session.add(user)
    await session.commit()
    await session.refresh(user)

    token = create_access_token({"sub": str(user.id), "role": user.role})
    logger.info("User registered successfully: id=%s email=%s", user.id, user.email)

    return AuthResponse(
        access_token=token,
        role=user.role,
        email=user.email,
        name=user.name,
    )

# ---------------------------
# Admin Routes (Protected)
# ---------------------------
@router.get("/admin/dashboard")
async def admin_dashboard(admin: User = Depends(get_admin_user)):
    return {"message": f"Welcome Admin {admin.name}"}

@router.get("/admin/users")
async def admin_users(admin: User = Depends(get_admin_user)):
    return {"message": "User management page"}

@router.get("/admin/settings")
async def admin_settings(admin: User = Depends(get_admin_user)):
    return {"message": "App settings page"}