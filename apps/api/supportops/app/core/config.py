# app/core/config.py
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # =========================
    # AUTH / JWT
    # =========================
    JWT_SECRET: str = "super-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 hours

    # =========================
    # DATABASE
    # =========================
    DATABASE_URL: str = "sqlite:///./supportops.db"

    # =========================
    # STRIPE (Billing)
    # =========================
    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None

    STRIPE_PRICE_STARTER: str | None = None
    STRIPE_PRICE_PRO: str | None = None
    STRIPE_PRICE_ENTERPRISE: str | None = None

    # =========================
    # FRONTEND / CORS
    # =========================
    FRONTEND_URL: str = "http://localhost:5173"

    # =========================
    # GENERAL
    # =========================
    PROJECT_NAME: str = "SupportOps API"
    DEBUG: bool = False

    # ✅ Load from .env automatically
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",  # prevents crashes if env has extra vars
    )


# ✅ SINGLE instance used everywhere
settings = Settings()