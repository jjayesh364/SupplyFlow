"""Tests for API v1 data endpoints."""

import pytest


@pytest.mark.asyncio
async def test_list_locations_endpoint(async_client):
    """Verify GET /api/v1/locations returns synthetic locations."""
    response = await async_client.get("/api/v1/locations")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 14
    for loc in data:
        assert loc["synthetic_data"] is True
        assert "latitude" in loc
        assert "longitude" in loc
        assert "elevation_m" in loc
        assert loc["code"].startswith("LOC-")


@pytest.mark.asyncio
async def test_filter_locations_by_type(async_client):
    """Verify filtering locations by location_type."""
    response = await async_client.get("/api/v1/locations?location_type=BASE_DEPOT")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    for loc in data:
        assert loc["location_type"] == "BASE_DEPOT"


@pytest.mark.asyncio
async def test_list_supplies_endpoint(async_client):
    """Verify GET /api/v1/supplies returns supply catalog."""
    response = await async_client.get("/api/v1/supplies")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 20
    for item in data:
        assert item["synthetic_data"] is True
        assert item["sku"].startswith("SKU-")
        assert item["category"] in [
            "Food/Rations",
            "Fuel/POL",
            "Medical",
            "Maintenance/Spares",
            "General Supplies",
        ]


@pytest.mark.asyncio
async def test_filter_supplies_by_category(async_client):
    """Verify filtering supplies by category."""
    response = await async_client.get("/api/v1/supplies?category=Fuel/POL")
    assert response.status_code == 200
    data = response.json()
    assert len(data) > 0
    for item in data:
        assert item["category"] == "Fuel/POL"


@pytest.mark.asyncio
async def test_list_inventory_endpoint(async_client):
    """Verify GET /api/v1/inventory returns inventory levels."""
    response = await async_client.get("/api/v1/inventory?limit=20")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 20
    for inv in data:
        assert "location" in inv
        assert "item" in inv
        assert inv["quantity"] >= 0
        assert inv["location"]["synthetic_data"] is True


@pytest.mark.asyncio
async def test_list_vehicles_endpoint(async_client):
    """Verify GET /api/v1/vehicles returns fleet."""
    response = await async_client.get("/api/v1/vehicles")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 18
    for veh in data:
        assert veh["synthetic_data"] is True
        assert veh["vehicle_code"].startswith("VEH-")
        assert "home_location" in veh


@pytest.mark.asyncio
async def test_list_shipments_endpoint(async_client):
    """Verify GET /api/v1/shipments returns shipments with items."""
    response = await async_client.get("/api/v1/shipments")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 6
    for shipment in data:
        assert shipment["synthetic_data"] is True
        assert shipment["shipment_code"].startswith("SHP-")
        assert "origin_location" in shipment
        assert "destination_location" in shipment
        assert "items" in shipment
        assert len(shipment["items"]) > 0


@pytest.mark.asyncio
async def test_list_routes_endpoint(async_client):
    """Verify GET /api/v1/routes returns road corridors."""
    response = await async_client.get("/api/v1/routes")
    assert response.status_code == 200
    data = response.json()
    assert len(data) >= 30
    for route in data:
        assert route["synthetic_data"] is True
        assert route["distance_km"] > 0
        assert route["weather_friction_multiplier"] >= 1.0
        assert "origin_location" in route
        assert "destination_location" in route
