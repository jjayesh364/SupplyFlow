"""
Database Seeding Script for SupplyFlow Phase 2.
Executes deterministic synthetic data generation, integrity validation, and database insertion.
"""

import asyncio
import logging

from sqlalchemy import delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import AsyncSessionLocal, async_engine
from app.db.synthetic_generator import DEFAULT_SEED, SyntheticDataGenerator
from app.models.consumption import ConsumptionRecord
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.route import RouteEdge
from app.models.shipment import Shipment, ShipmentItem
from app.models.supply import SupplyItem
from app.models.vehicle import Vehicle

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("seed")


def validate_synthetic_dataset(data: dict[str, list]) -> None:
    """Pre-commit programmatic integrity verification."""
    logger.info("Validating synthetic data integrity constraints...")

    # 1. Location code uniqueness
    loc_codes = [loc.code for loc in data["locations"]]
    assert len(loc_codes) == len(set(loc_codes)), "Duplicate location codes found"

    # 2. Supply SKU uniqueness
    skus = [item.sku for item in data["supply_items"]]
    assert len(skus) == len(set(skus)), "Duplicate supply item SKUs found"

    # 3. Vehicle code uniqueness
    veh_codes = [veh.vehicle_code for veh in data["vehicles"]]
    assert len(veh_codes) == len(set(veh_codes)), "Duplicate vehicle codes found"

    # 4. Inventory mass-balance checks
    for inv in data["inventory"]:
        assert inv.quantity >= 0, f"Negative inventory quantity: {inv}"
        assert inv.reserved_quantity >= 0, f"Negative reserved quantity: {inv}"
        assert inv.safety_stock >= 0, f"Negative safety stock: {inv}"
        assert inv.reserved_quantity <= inv.quantity, f"Reserved stock exceeds available stock: {inv}"
        assert inv.quantity <= inv.max_capacity, f"Quantity exceeds max capacity: {inv}"

    # 5. Consumption non-negative checks
    for c in data["consumption"]:
        assert c.quantity_consumed >= 0, f"Negative consumption: {c}"

    # 6. Route edges non-negative distance & travel time
    for r in data["routes"]:
        assert r.distance_km > 0, f"Invalid route distance: {r}"
        assert r.nominal_travel_time_hrs > 0, f"Invalid route travel time: {r}"
        assert r.weather_friction_multiplier >= 1.0, f"Friction multiplier < 1.0: {r}"

    # 7. Shipment manifest items check
    for s in data["shipments"]:
        assert len(s.items) > 0, f"Shipment has empty manifest: {s.shipment_code}"
        for item in s.items:
            assert item.quantity > 0, f"Non-positive shipment item quantity: {item}"

    # 8. All synthetic_data watermarks confirmed True
    assert all(loc.synthetic_data for loc in data["locations"]), "Location missing synthetic watermark"
    assert all(item.synthetic_data for item in data["supply_items"]), "Item missing synthetic watermark"
    assert all(r.synthetic_data for r in data["routes"]), "Route missing synthetic watermark"
    assert all(v.synthetic_data for v in data["vehicles"]), "Vehicle missing synthetic watermark"
    assert all(c.synthetic_data for c in data["consumption"]), "Consumption missing synthetic watermark"
    assert all(s.synthetic_data for s in data["shipments"]), "Shipment missing synthetic watermark"

    logger.info("Validation passed: All mass-balance and synthetic integrity rules satisfied.")


async def clear_existing_data(session: AsyncSession) -> None:
    """Clear previously seeded tables in foreign-key safe order."""
    logger.info("Clearing any existing synthetic data...")
    await session.execute(delete(ShipmentItem))
    await session.execute(delete(Shipment))
    await session.execute(delete(ConsumptionRecord))
    await session.execute(delete(Inventory))
    await session.execute(delete(RouteEdge))
    await session.execute(delete(Vehicle))
    await session.execute(delete(SupplyItem))
    await session.execute(delete(Location))
    await session.commit()
    logger.info("Existing tables cleared.")


async def seed_database(seed: int = DEFAULT_SEED, reset: bool = True) -> dict[str, int]:
    """Generate and persist synthetic demonstration datasets."""
    logger.info(f"Initializing SyntheticDataGenerator with seed={seed}...")
    generator = SyntheticDataGenerator(seed=seed)
    data = generator.generate_all()

    validate_synthetic_dataset(data)

    async with AsyncSessionLocal() as session:
        if reset:
            await clear_existing_data(session)

        # 1. Insert Locations
        logger.info(f"Seeding {len(data['locations'])} synthetic locations...")
        session.add_all(data["locations"])
        await session.flush()

        # 2. Insert Supply Items
        logger.info(f"Seeding {len(data['supply_items'])} synthetic supply items...")
        session.add_all(data["supply_items"])
        await session.flush()

        # 3. Insert Route Edges
        logger.info(f"Seeding {len(data['routes'])} synthetic route edges...")
        session.add_all(data["routes"])
        await session.flush()

        # 4. Insert Vehicles
        logger.info(f"Seeding {len(data['vehicles'])} synthetic vehicles...")
        session.add_all(data["vehicles"])
        await session.flush()

        # 5. Insert Inventory
        logger.info(f"Seeding {len(data['inventory'])} inventory records...")
        session.add_all(data["inventory"])
        await session.flush()

        # 6. Insert Consumption Records in batches
        logger.info(f"Seeding {len(data['consumption'])} historical consumption records...")
        batch_size = 2000
        for i in range(0, len(data["consumption"]), batch_size):
            session.add_all(data["consumption"][i : i + batch_size])
            await session.flush()

        # 7. Insert Shipments & Items
        logger.info(f"Seeding {len(data['shipments'])} synthetic demonstration shipments...")
        session.add_all(data["shipments"])
        await session.commit()

        counts = {
            "locations": len(data["locations"]),
            "supply_items": len(data["supply_items"]),
            "route_edges": len(data["routes"]),
            "vehicles": len(data["vehicles"]),
            "inventory": len(data["inventory"]),
            "consumption_records": len(data["consumption"]),
            "shipments": len(data["shipments"]),
        }

        logger.info("=" * 60)
        logger.info("SYNTHETIC DATABASE SEEDING COMPLETED SUCCESSFULLY")
        for k, v in counts.items():
            logger.info(f"  - {k}: {v} records")
        logger.info("All records watermarked: [SYNTHETIC / SIMULATION DATA]")
        logger.info("=" * 60)
        return counts


async def main():
    """CLI execution entrypoint."""
    try:
        await seed_database(reset=True)
    finally:
        await async_engine.dispose()


if __name__ == "__main__":
    asyncio.run(main())
