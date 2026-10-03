"""Tests for API health and metadata endpoints."""


def test_root_endpoint(client):
    """Test the root endpoint returns project metadata and synthetic data flag."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "SupplyFlow" in data["project"]
    assert data["synthetic_data_only"] is True
    assert "DEMONSTRATION THEATER" in data["demonstration_theater"]


def test_ping_endpoint(client):
    """Test the liveness ping endpoint."""
    response = client.get("/api/v1/ping")
    assert response.status_code == 200
    data = response.json()
    assert data["ping"] == "pong"
    assert data["synthetic_data"] is True


def test_health_endpoint(client):
    """Test health check returns structured database and configuration status."""
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert data["is_synthetic_data_only"] is True
    assert "DEMONSTRATION THEATER" in data["demo_theater_label"]

    # Check database status block exists
    assert "database" in data
    assert "connected" in data["database"]
    assert "postgis_installed" in data["database"]

    # Check configuration block exists and has non-zero values
    assert "configuration" in data
    assert data["configuration"]["dos_critical_threshold_days"] > 0
    assert data["configuration"]["convoy_daylight_start_hour"] >= 0
    assert data["configuration"]["convoy_daylight_end_hour"] <= 24
