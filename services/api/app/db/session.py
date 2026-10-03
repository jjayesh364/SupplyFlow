"""Database connection management and session factories."""

from collections.abc import AsyncGenerator
from typing import Any

from sqlalchemy import create_engine, text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.core.config import settings

# Async Engine (for FastAPI route handlers)
async_engine = create_async_engine(
    settings.DATABASE_URL,
    echo=False,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
)

# Async Session Factory
AsyncSessionLocal = async_sessionmaker(
    bind=async_engine,
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    expire_on_commit=False,
)

# Sync Engine (for migrations, scripts, and utilities)
sync_engine = create_engine(
    settings.SYNC_DATABASE_URL,
    pool_pre_ping=True,
)


async def get_db() -> AsyncGenerator[AsyncSession]:
    """Dependency that provides an async database session per request."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def check_database_connection() -> dict[str, Any]:
    """
    Checks database reachability and PostGIS extension status.
    Returns structured connection status dictionary.
    """
    try:
        async with async_engine.connect() as conn:
            # Check basic query connectivity
            result = await conn.execute(text("SELECT 1;"))
            scalar = result.scalar()

            # Check for PostGIS extension
            postgis_check = await conn.execute(
                text("SELECT default_version, installed_version FROM pg_available_extensions WHERE name = 'postgis';")
            )
            postgis_row = postgis_check.first()
            postgis_installed = bool(postgis_row and postgis_row[1] is not None)
            postgis_version = postgis_row[1] if postgis_installed else None

            return {
                "connected": True,
                "scalar_test": scalar == 1,
                "postgis_installed": postgis_installed,
                "postgis_version": postgis_version,
                "error": None,
            }
    except Exception as exc:  # noqa: BLE001
        return {
            "connected": False,
            "scalar_test": False,
            "postgis_installed": False,
            "postgis_version": None,
            "error": str(exc),
        }
