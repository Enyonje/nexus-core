"""Strict environment configuration for the legacy SupportOps Python service.

Secrets and database URLs must be supplied by the deployment environment.
No development credentials or local SQLite database are silently selected.
"""
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    JWT_SECRET: str
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # During the staged split this remains the current SupportOps runtime DB URL.
    # It is intentionally not switched to SUPPORTOPS_TARGET_DATABASE_URL here.
    DATABASE_URL: str

    STRIPE_SECRET_KEY: str | None = None
    STRIPE_WEBHOOK_SECRET: str | None = None
    STRIPE_PRICE_STARTER: str | None = None
    STRIPE_PRICE_PRO: str | None = None
    STRIPE_PRICE_ENTERPRISE: str | None = None

    FRONTEND_URL: str = "http://localhost:5173"
    PROJECT_NAME: str = "SupportOps API"
    DEBUG: bool = False

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
        case_sensitive=True,
    )


settings = Settings()
