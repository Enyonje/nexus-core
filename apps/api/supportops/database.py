import logging
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy import text
from sqlmodel import SQLModel
from app.core.config import settings

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("supportops.db")

engine = None
async_session = None


def setup_engine():
    """Initialize the async engine and session factory lazily."""
    global engine, async_session

    if not settings.DATABASE_URL:
        raise RuntimeError("❌ DATABASE_URL is not set")

    logger.info(f"🔧 Creating async engine with driver: {settings.DATABASE_URL}")

    # Disable statement cache + prepared statements for PgBouncer compatibility
    engine = create_async_engine(
        settings.DATABASE_URL,
        echo=False,
        future=True,
        connect_args={"statement_cache_size": 0},
    )

    # ✅ Disable prepared statements at the SQLAlchemy dialect level
    engine = engine.execution_options(prepared_statement_cache_size=0)

    async_session = sessionmaker(
        bind=engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    logger.info("✅ Async engine and session factory initialized")


async def init_db():
    """Create tables at startup and log DB connectivity."""
    if engine is None:
        setup_engine()

    try:
        async with engine.connect() as conn:
            result = await conn.execute(text("SELECT 1"))
            if result.scalar() == 1:
                logger.info("🟢 Database connectivity check passed")
    except Exception as e:
        logger.error(f"❌ Database connectivity failed: {e}")
        raise

    async with engine.begin() as conn:
        await conn.run_sync(SQLModel.metadata.create_all)
        logger.info("📦 Tables ensured via SQLModel metadata")


async def shutdown_db():
    """Dispose of the engine gracefully at shutdown."""
    if engine is not None:
        logger.info("🔻 Disposing DB engine...")
        await engine.dispose()
        logger.info("✅ DB engine disposed")


async def get_session() -> AsyncSession:
    """Dependency for FastAPI routes."""
    if async_session is None:
        setup_engine()
    logger.debug("📥 Opening new DB session")
    async with async_session() as session:
        yield session
    logger.debug("📤 DB session closed")