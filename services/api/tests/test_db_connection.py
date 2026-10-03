"""Tests for database connectivity logic and graceful degradation."""

import pytest

from app.db.session import check_database_connection


@pytest.mark.asyncio
async def test_database_connection_probe_structure():
    """Verify check_database_connection returns well-formed status dictionary without raising."""
    status = await check_database_connection()
    assert isinstance(status, dict)
    assert "connected" in status
    assert "scalar_test" in status
    assert "postgis_installed" in status
    assert "postgis_version" in status
    assert "error" in status
    # If not connected, error should be recorded rather than unhandled exception
    if not status["connected"]:
        assert status["error"] is not None
