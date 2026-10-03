from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession
import logging

from app.database import init_db, shutdown_db, get_session
from app.api.router import api_router
from app.core.config import settings

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# ---------------------------
# Lifespan (DB startup/shutdown)
# ---------------------------
@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()

    db_url = settings.DATABASE_URL
    if db_url.startswith("sqlite"):
        logger.info("🟢 Running with SQLite (local dev)")
    elif "supabase.co" in db_url:
        logger.info("🌐 Running with Supabase Postgres (production)")
    else:
        logger.info(f"🔧 Running with custom DB backend: {db_url}")

    yield
    await shutdown_db()


# ---------------------------
# App Init
# ---------------------------
app = FastAPI(
    title="SupportOps AI",
    version="0.1.0",
    lifespan=lifespan,
)


# ---------------------------
# CORS Setup (FIXED)
# ---------------------------
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://supportops-ai.vercel.app",  # production frontend
        "http://localhost:3000",             # local dev (React)
        "http://localhost:5173",             # local dev (Vite)
    ],
    allow_origin_regex=r"https://supportops-ai.*\.vercel\.app",  # allow Vercel preview deployments
    allow_credentials=True,
    allow_methods=["*"],   # allow all HTTP methods
    allow_headers=["*"],   # allow all headers
)


# ---------------------------
# Routers
# ---------------------------
app.include_router(api_router, prefix="/api/v1")


# ---------------------------
# Health Checks
# ---------------------------
@app.get("/db-check")
async def db_check(session: AsyncSession = Depends(get_session)):
    result = await session.execute(text("SELECT 1"))
    return {"status": "ok" if result.scalar() == 1 else "error"}


@app.get("/env-check")
def env_check():
    db_url = settings.DATABASE_URL

    if db_url.startswith("sqlite"):
        db_backend = "SQLite"
    elif "supabase.co" in db_url:
        db_backend = "Supabase/Postgres"
    else:
        db_backend = "Custom"

    return {
        "project_name": settings.PROJECT_NAME,
        "frontend_url": settings.FRONTEND_URL,
        "debug_mode": bool(settings.DEBUG),
        "database_backend": db_backend,
    }
