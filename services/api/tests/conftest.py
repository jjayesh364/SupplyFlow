"""Pytest fixtures for API testing."""

import sys
from pathlib import Path

import pytest
import pytest_asyncio
from fastapi.testclient import TestClient
from httpx import ASGITransport, AsyncClient

# Ensure app is on sys.path
api_root = Path(__file__).resolve().parent.parent
if str(api_root) not in sys.path:
    sys.path.insert(0, str(api_root))

from app.db.session import async_engine
from app.main import app


@pytest.fixture
def client():
    """Synchronous FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client


@pytest_asyncio.fixture
async def async_client():
    """Asynchronous httpx AsyncClient fixture for ASGI endpoints."""
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as ac:
        yield ac


@pytest_asyncio.fixture(autouse=True)
async def dispose_async_engine_after_test():
    """Ensure asyncpg connection pool is disposed before closing the test event loop."""
    yield
    await async_engine.dispose()
