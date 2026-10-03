"""
Automated Verification Tests for Accelerated Blocks 1, 2, and 3.

Covers:
- GIS network GeoJSON, terrain slope, grade friction
- Open-Meteo weather integration & offline fallback
- Demand forecasting with HistGradientBoosting and evaluation metrics
- Deterministic inventory risk & Days-of-Supply
- OR-Tools CVRPTW solver execution & recommendations
- What-If simulation engine with scenario deltas
"""

import pytest

from app.db.session import AsyncSessionLocal
from app.services.forecast.forecasting_service import forecasting_service
from app.services.gis.terrain_service import terrain_service
from app.services.inventory.risk_service import inventory_risk_service
from app.services.optimization.vrp_service import vrp_service
from app.services.simulation.simulation_service import simulation_service
from app.services.weather.weather_service import weather_service


def test_terrain_slope_and_grade_friction():
    """Verify slope degrees calculation and grade friction multipliers."""
    # 500m elevation gain over 10km (0.05 gradient)
    slope = terrain_service.calculate_slope_degrees(distance_km=10.0, elev_diff_m=500.0)
    assert 2.8 <= slope <= 2.9

    friction_mild = terrain_service.calculate_grade_friction(slope_deg=2.86)
    assert 1.10 <= friction_mild <= 1.25

    # Steep mountain pass: 12 degrees
    friction_steep = terrain_service.calculate_grade_friction(slope_deg=12.0)
    assert friction_steep >= 1.60

    # Flat road: 0 degrees
    assert terrain_service.calculate_grade_friction(slope_deg=0.0) == 1.0


def test_weather_friction_and_blockage():
    """Verify weather friction calculations and snow pass blockage thresholds."""
    # Normal cold: -5C, no snow
    friction, is_blocked = weather_service.calculate_weather_friction(
        temperature_c=-5.0, snowfall_cm=0.0, rainfall_mm=0.0, wind_speed_kmh=15.0
    )
    assert friction >= 1.05
    assert not is_blocked

    # Extreme blizzard: -25C, 18 cm snowfall, 50 km/h wind
    friction_blizzard, is_blocked_blizzard = weather_service.calculate_weather_friction(
        temperature_c=-25.0, snowfall_cm=18.0, rainfall_mm=0.0, wind_speed_kmh=50.0
    )
    assert friction_blizzard > 2.0
    assert is_blocked_blizzard is True  # snowfall >= 15 cm threshold


@pytest.mark.asyncio
async def test_weather_service_offline_fallback():
    """Verify weather service falls back gracefully with deterministic climate values."""
    weather = await weather_service.get_current_weather(lat=34.2, lon=77.5)
    assert weather.latitude == 34.2
    assert weather.longitude == 77.5
    assert weather.friction_multiplier >= 1.0
    assert weather.source in ["OPEN_METEO_API", "OFFLINE_DETERMINISTIC_CACHE"]


@pytest.mark.asyncio
async def test_forecasting_pipeline_evaluation():
    """Verify demand forecasting models train and evaluate with positive sample counts."""
    async with AsyncSessionLocal() as session:
        result = await forecasting_service.train_and_generate_forecasts(horizon_days=7, db=session)
        assert result["status"] == "success"
        assert result["total_forecasts_generated"] > 0
        metrics = result["evaluation_metrics"]
        assert metrics["samples_evaluated"] > 0
        assert metrics["wape"] >= 0.0
        assert metrics["mae"] >= 0.0
        assert metrics["rmse"] >= 0.0


@pytest.mark.asyncio
async def test_inventory_risk_assessment_invariants():
    """Verify Days of Supply (DoS) and risk state categorization."""
    async with AsyncSessionLocal() as session:
        assessments = await inventory_risk_service.assess_network_inventory_risk(session)
        assert len(assessments) > 0
        for ass in assessments:
            assert ass.days_of_supply >= 0.0
            assert ass.risk_state in ["CRITICAL", "WARNING", "ADEQUATE", "EXCESS"]
            assert 0.0 <= ass.urgency_score <= 100.0
            assert len(ass.explainability) > 0


@pytest.mark.asyncio
async def test_vrp_fleet_dispatch_optimization():
    """Verify OR-Tools CVRPTW solves feasible replenishment routes."""
    async with AsyncSessionLocal() as session:
        result = await vrp_service.solve_replenishment_dispatch(session, max_solve_time_seconds=3)
        assert result["status"] == "success"
        assert result["solver_status"] in ["OPTIMAL", "FEASIBLE"]
        assert result["dispatched_vehicles_count"] >= 1
        assert len(result["plans"]) >= 1
        first_plan = result["plans"][0]
        assert first_plan["capacity_kg"] > 0
        assert first_plan["total_distance_km"] > 0


@pytest.mark.asyncio
async def test_simulation_scenarios_and_deltas():
    """Verify What-If simulation service calculates valid scenario deltas."""
    async with AsyncSessionLocal() as session:
        # 1. Normal baseline
        res_normal = await simulation_service.run_scenario("NORMAL", session)
        assert res_normal["status"] == "success"
        assert res_normal["delta"]["critical_stockouts_delta"] == 0

        # 2. Severe weather scenario increases friction and stockouts
        res_weather = await simulation_service.run_scenario("SEVERE_WEATHER", session)
        assert res_weather["status"] == "success"
        assert res_weather["delta"]["route_friction_delta"] > 0
        assert res_weather["delta"]["blocked_corridors_delta"] > 0

        # 3. Demand surge decreases average Days of Supply
        res_surge = await simulation_service.run_scenario("DEMAND_SURGE", session)
        assert res_surge["delta"]["average_dos_delta"] < 0


@pytest.mark.asyncio
async def test_api_network_geojson_endpoint(async_client):
    """Verify GET /api/v1/gis/network-geojson returns valid MapLibre GeoJSON."""
    resp = await async_client.get("/api/v1/gis/network-geojson")
    assert resp.status_code == 200
    data = resp.json()
    assert data["type"] == "FeatureCollection"
    assert "features" in data
    assert len(data["features"]) >= 14  # At least the 14 locations
    node_features = [f for f in data["features"] if f["properties"].get("layer_type") == "LOGISTICS_NODE"]
    assert len(node_features) == 14
    assert node_features[0]["geometry"]["type"] == "Point"


@pytest.mark.asyncio
async def test_api_simulation_endpoint(async_client):
    """Verify POST /api/v1/simulation/scenario endpoint."""
    resp = await async_client.post(
        "/api/v1/simulation/scenario",
        json={"scenario_type": "ROUTE_BLOCKAGE"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "success"
    assert data["scenario_requested"] == "ROUTE_BLOCKAGE"
    assert "delta" in data


@pytest.mark.asyncio
async def test_all_mvp_smoke_endpoints(async_client):
    """Smoke test every core MVP endpoint required for dashboard operation."""
    # 1. Locations
    r_loc = await async_client.get("/api/v1/locations")
    assert r_loc.status_code == 200
    locations = r_loc.json()
    assert len(locations) >= 14
    origin_id = locations[0]["id"]
    dest_id = locations[-1]["id"]

    # 2. Supplies
    r_sup = await async_client.get("/api/v1/supplies")
    assert r_sup.status_code == 200
    assert len(r_sup.json()) >= 20

    # 3. Inventory
    r_inv = await async_client.get("/api/v1/inventory")
    assert r_inv.status_code == 200
    assert len(r_inv.json()) > 0

    # 4. Vehicles
    r_veh = await async_client.get("/api/v1/vehicles")
    assert r_veh.status_code == 200
    assert len(r_veh.json()) > 0

    # 5. Routes
    r_rt = await async_client.get("/api/v1/routes")
    assert r_rt.status_code == 200
    assert len(r_rt.json()) > 0

    # 6. Shipments
    r_ship = await async_client.get("/api/v1/shipments")
    assert r_ship.status_code == 200

    # 7. GIS Weather
    r_wx = await async_client.get("/api/v1/gis/weather?lat=34.1&lon=77.5")
    assert r_wx.status_code == 200
    assert "temperature_c" in r_wx.json()

    # 8. GIS Route Plan
    r_rp = await async_client.get(f"/api/v1/gis/route-plan?origin_id={origin_id}&destination_id={dest_id}")
    assert r_rp.status_code == 200
    assert "path_location_ids" in r_rp.json()

    # 9. Forecasts
    r_fc = await async_client.get("/api/v1/forecasts")
    assert r_fc.status_code == 200

    # 10. Inventory Risk Assessment
    r_risk = await async_client.get("/api/v1/inventory/risk-assessment")
    assert r_risk.status_code == 200
    assert len(r_risk.json()) > 0

    # 11. Alerts
    r_alt = await async_client.get("/api/v1/alerts")
    assert r_alt.status_code == 200

    # 12. Optimization solve dispatch
    r_opt = await async_client.post("/api/v1/optimization/solve-dispatch", json={"max_solve_time_seconds": 3})
    assert r_opt.status_code == 200
    assert r_opt.json()["status"] == "success"
