"""Pytest fixtures for API testing."""

import sys
from pathlib import Path

import pytest
from fastapi.testclient import TestClient

# Ensure app is on sys.path
api_root = Path(__file__).resolve().parent.parent
if str(api_root) not in sys.path:
    sys.path.insert(0, str(api_root))

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    """Synchronous FastAPI TestClient fixture."""
    with TestClient(app) as test_client:
        yield test_client
