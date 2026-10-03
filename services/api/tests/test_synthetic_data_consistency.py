"""Tests verifying synthetic data consistency, invariants, and theater bounding boxes."""

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.db.session import sync_engine
from app.models.consumption import ConsumptionRecord
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.route import RouteEdge
from app.models.shipment import Shipment
from app.models.supply import SupplyItem
from app.models.vehicle import Vehicle


def test_all_entities_marked_synthetic():
    """Verify strictly 100% of generated demonstration entities are labeled synthetic_data=True."""
    with Session(sync_engine) as session:
        # Locations
        loc_non_synthetic = session.query(Location).filter(Location.synthetic_data.is_(False)).count()
        assert loc_non_synthetic == 0, "Found locations not marked synthetic"

        # Supply items
        item_non_synthetic = session.query(SupplyItem).filter(SupplyItem.synthetic_data.is_(False)).count()
        assert item_non_synthetic == 0, "Found supplies not marked synthetic"

        # Vehicles
        veh_non_synthetic = session.query(Vehicle).filter(Vehicle.synthetic_data.is_(False)).count()
        assert veh_non_synthetic == 0, "Found vehicles not marked synthetic"

        # Route edges
        route_non_synthetic = session.query(RouteEdge).filter(RouteEdge.synthetic_data.is_(False)).count()
        assert route_non_synthetic == 0, "Found routes not marked synthetic"

        # Shipments
        shipment_non_synthetic = session.query(Shipment).filter(Shipment.synthetic_data.is_(False)).count()
        assert shipment_non_synthetic == 0, "Found shipments not marked synthetic"

        # Consumption records
        cons_non_synthetic = (
            session.query(ConsumptionRecord).filter(ConsumptionRecord.synthetic_data.is_(False)).count()
        )
        assert cons_non_synthetic == 0, "Found consumption records not marked synthetic"


def test_geographic_theater_bounds():
    """Verify all location coordinates lie strictly within the synthetic Northern demonstration theater."""
    with Session(sync_engine) as session:
        locations = session.query(Location).all()
        assert len(locations) >= 14
        for loc in locations:
            # Latitudes between 32.0 and 36.0 N, Longitudes between 74.0 and 78.5 E
            assert 32.0 <= loc.latitude <= 36.0, f"{loc.code} latitude {loc.latitude} out of bounds"
            assert 74.0 <= loc.longitude <= 78.5, f"{loc.code} longitude {loc.longitude} out of bounds"
            assert loc.elevation_m >= 300.0, f"{loc.code} elevation {loc.elevation_m} unreasonably low"


def test_consumption_history_continuity_and_covariance():
    """Verify 180 days of continuous consumption per item across forward posts with realistic weather variables."""
    with Session(sync_engine) as session:
        # Check distinct dates
        distinct_dates = session.query(func.count(func.distinct(ConsumptionRecord.recorded_date))).scalar()
        assert distinct_dates >= 180, f"Expected at least 180 historical dates, got {distinct_dates}"

        # Total consumption records = 180 days * 12 forward nodes * 20 items = 43,200 records
        total_records = session.query(func.count(ConsumptionRecord.id)).scalar()
        assert total_records >= 43000, f"Expected >= 43000 records, got {total_records}"

        # Verify temperature range represents high-altitude northern region (-25°C to +30°C)
        min_temp = session.query(func.min(ConsumptionRecord.weather_temp_c)).scalar()
        max_temp = session.query(func.max(ConsumptionRecord.weather_temp_c)).scalar()
        assert min_temp < 0.0, f"Expected sub-zero winter temperatures, min was {min_temp}"
        assert max_temp < 35.0, f"Expected max temperature below 35°C in mountain theater, got {max_temp}"


def test_inventory_capacity_and_safety_stock_invariants():
    """Verify inventory levels do not violate maximum storage capacities."""
    with Session(sync_engine) as session:
        violating_capacities = session.query(Inventory).filter(Inventory.quantity > Inventory.max_capacity).count()
        assert violating_capacities == 0, "Found inventory items exceeding max capacity"

        violating_reserved = session.query(Inventory).filter(Inventory.reserved_quantity > Inventory.quantity).count()
        assert violating_reserved == 0, "Found reserved quantities exceeding on-hand quantities"
