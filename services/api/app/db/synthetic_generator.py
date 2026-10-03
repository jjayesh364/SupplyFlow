"""
Synthetic Indian Logistics Network & Data Generator for SupplyFlow.

CRITICAL DATA GOVERNANCE COMPLIANCE:
- All generated entities represent fictional simulation demonstration data.
- Explicitly watermarked with synthetic_data = True.
- No real military deployments, units, operational routes, or strategic inventories are used.
"""

import math
import random
from datetime import UTC, datetime, timedelta

from geoalchemy2.shape import from_shape
from shapely.geometry import LineString, Point

from app.models.consumption import ConsumptionRecord
from app.models.inventory import Inventory
from app.models.location import Location
from app.models.route import RouteEdge
from app.models.shipment import Shipment, ShipmentItem
from app.models.supply import SupplyItem
from app.models.vehicle import Vehicle

# Fixed demonstration seed for 100% reproducibility
DEFAULT_SEED = 42


def get_synthetic_locations_spec() -> list[dict]:
    """14 fictional logistics nodes in a high-altitude Himalayan demonstration corridor."""
    return [
        # Rear Logistics Depots (Echelon 1)
        {
            "code": "LOC-BASE-ALPHA",
            "name": "[SYNTHETIC] Regional Supply Depot Alpha",
            "location_type": "BASE_DEPOT",
            "lat": 32.2432,
            "lon": 76.3214,
            "elevation_m": 1650.0,
        },
        {
            "code": "LOC-BASE-BRAVO",
            "name": "[SYNTHETIC] Strategic Base Depot Bravo",
            "location_type": "BASE_DEPOT",
            "lat": 32.5518,
            "lon": 76.8492,
            "elevation_m": 1920.0,
        },
        # Forward Supply Depots (Echelon 2)
        {
            "code": "LOC-FSD-NORTH",
            "name": "[SYNTHETIC] Forward Supply Depot North",
            "location_type": "FORWARD_SUPPLY_DEPOT",
            "lat": 32.9512,
            "lon": 77.1645,
            "elevation_m": 2780.0,
        },
        {
            "code": "LOC-FSD-CENTRAL",
            "name": "[SYNTHETIC] Forward Supply Depot Central",
            "location_type": "FORWARD_SUPPLY_DEPOT",
            "lat": 33.3284,
            "lon": 77.4215,
            "elevation_m": 3150.0,
        },
        {
            "code": "LOC-FSD-EAST",
            "name": "[SYNTHETIC] Forward Supply Depot East",
            "location_type": "FORWARD_SUPPLY_DEPOT",
            "lat": 33.6421,
            "lon": 77.7812,
            "elevation_m": 3480.0,
        },
        {
            "code": "LOC-FSD-VALLEY",
            "name": "[SYNTHETIC] Forward Supply Depot Valley",
            "location_type": "FORWARD_SUPPLY_DEPOT",
            "lat": 33.1150,
            "lon": 76.9120,
            "elevation_m": 2890.0,
        },
        # Forward Operating Posts (Echelon 3 - High Altitude)
        {
            "code": "LOC-POST-EAGLE",
            "name": "[SYNTHETIC] Forward Post Eagle Ridge",
            "location_type": "FORWARD_POST",
            "lat": 33.8415,
            "lon": 77.5620,
            "elevation_m": 4210.0,
        },
        {
            "code": "LOC-POST-GLACIER",
            "name": "[SYNTHETIC] Forward Post Glacier Point",
            "location_type": "FORWARD_POST",
            "lat": 34.3912,
            "lon": 78.1150,
            "elevation_m": 4860.0,
        },
        {
            "code": "LOC-POST-PASS-A",
            "name": "[SYNTHETIC] Forward Post Mountain Pass A",
            "location_type": "FORWARD_POST",
            "lat": 33.5120,
            "lon": 77.2140,
            "elevation_m": 4350.0,
        },
        {
            "code": "LOC-POST-PASS-B",
            "name": "[SYNTHETIC] Forward Post Mountain Pass B",
            "location_type": "FORWARD_POST",
            "lat": 34.1120,
            "lon": 77.8540,
            "elevation_m": 4620.0,
        },
        {
            "code": "LOC-POST-FRONTIER",
            "name": "[SYNTHETIC] Forward Post Frontier View",
            "location_type": "FORWARD_POST",
            "lat": 34.2540,
            "lon": 77.4120,
            "elevation_m": 4120.0,
        },
        {
            "code": "LOC-POST-SUMMIT",
            "name": "[SYNTHETIC] Forward Post Summit Camp",
            "location_type": "FORWARD_POST",
            "lat": 34.5980,
            "lon": 78.3450,
            "elevation_m": 4790.0,
        },
        {
            "code": "LOC-POST-RIVER",
            "name": "[SYNTHETIC] Forward Post River Gorge",
            "location_type": "FORWARD_POST",
            "lat": 33.4120,
            "lon": 76.7150,
            "elevation_m": 3580.0,
        },
        {
            "code": "LOC-POST-SECTOR-X",
            "name": "[SYNTHETIC] Forward Post Sector X",
            "location_type": "FORWARD_POST",
            "lat": 33.9510,
            "lon": 77.0620,
            "elevation_m": 3960.0,
        },
    ]


def get_synthetic_supplies_spec() -> list[dict]:
    """20 standardized synthetic supply catalog commodities."""
    return [
        # Food & Rations
        {
            "sku": "SKU-RAT-GRAIN",
            "name": "[SYNTHETIC] Whole Wheat Flour & Grains",
            "category": "Food/Rations",
            "unit": "kg",
            "weight": 50.0,
            "vol": 0.065,
            "crit": False,
            "life": 180,
        },
        {
            "sku": "SKU-RAT-RTE",
            "name": "[SYNTHETIC] High-Calorie Ready-to-Eat Ration Pack",
            "category": "Food/Rations",
            "unit": "boxes",
            "weight": 1.4,
            "vol": 0.003,
            "crit": True,
            "life": 365,
        },
        {
            "sku": "SKU-RAT-TINNED",
            "name": "[SYNTHETIC] Preserved Vegetables & Pulses",
            "category": "Food/Rations",
            "unit": "boxes",
            "weight": 12.0,
            "vol": 0.018,
            "crit": False,
            "life": 720,
        },
        {
            "sku": "SKU-RAT-BEV",
            "name": "[SYNTHETIC] Fortified Tea & Energy Drink Mix",
            "category": "Food/Rations",
            "unit": "kg",
            "weight": 5.0,
            "vol": 0.008,
            "crit": False,
            "life": 360,
        },
        # Fuel / POL
        {
            "sku": "SKU-POL-DSL-SUBZERO",
            "name": "[SYNTHETIC] Sub-Zero Winter Diesel (POL)",
            "category": "Fuel/POL",
            "unit": "liters",
            "weight": 0.84,
            "vol": 0.001,
            "crit": True,
            "life": None,
        },
        {
            "sku": "SKU-POL-KEROSENE",
            "name": "[SYNTHETIC] Arctic Heating Kerosene (Bukhari Fuel)",
            "category": "Fuel/POL",
            "unit": "liters",
            "weight": 0.81,
            "vol": 0.001,
            "crit": True,
            "life": None,
        },
        {
            "sku": "SKU-POL-AVGAS",
            "name": "[SYNTHETIC] High-Altitude Aviation Fuel",
            "category": "Fuel/POL",
            "unit": "liters",
            "weight": 0.80,
            "vol": 0.001,
            "crit": True,
            "life": None,
        },
        {
            "sku": "SKU-POL-LUBRICANT",
            "name": "[SYNTHETIC] Low-Temperature Synthetic Engine Oil",
            "category": "Fuel/POL",
            "unit": "liters",
            "weight": 0.90,
            "vol": 0.001,
            "crit": False,
            "life": 720,
        },
        # Medical Supplies
        {
            "sku": "SKU-MED-HAPE",
            "name": "[SYNTHETIC] High-Altitude Pulmonary Edema Kit",
            "category": "Medical",
            "unit": "boxes",
            "weight": 2.8,
            "vol": 0.005,
            "crit": True,
            "life": 365,
        },
        {
            "sku": "SKU-MED-TRAUMA",
            "name": "[SYNTHETIC] Emergency Trauma Dressing Pack",
            "category": "Medical",
            "unit": "boxes",
            "weight": 4.2,
            "vol": 0.008,
            "crit": True,
            "life": 720,
        },
        {
            "sku": "SKU-MED-OXYGEN",
            "name": "[SYNTHETIC] Portable Medical Oxygen Cylinder",
            "category": "Medical",
            "unit": "units",
            "weight": 7.5,
            "vol": 0.015,
            "crit": True,
            "life": None,
        },
        {
            "sku": "SKU-MED-FROSTBITE",
            "name": "[SYNTHETIC] Extreme Cold Injury Care Kit",
            "category": "Medical",
            "unit": "boxes",
            "weight": 3.0,
            "vol": 0.006,
            "crit": True,
            "life": 365,
        },
        # Maintenance & Spares
        {
            "sku": "SKU-SPR-TIRES",
            "name": "[SYNTHETIC] Heavy Truck Snow Chain & Tire Set",
            "category": "Maintenance/Spares",
            "unit": "units",
            "weight": 45.0,
            "vol": 0.120,
            "crit": False,
            "life": None,
        },
        {
            "sku": "SKU-SPR-BATTERY",
            "name": "[SYNTHETIC] Ultra-Cold Cranking Battery 24V",
            "category": "Maintenance/Spares",
            "unit": "units",
            "weight": 28.0,
            "vol": 0.025,
            "crit": True,
            "life": 1080,
        },
        {
            "sku": "SKU-SPR-FILTERS",
            "name": "[SYNTHETIC] Heavy Micron Air/Fuel Filter Pack",
            "category": "Maintenance/Spares",
            "unit": "boxes",
            "weight": 3.5,
            "vol": 0.007,
            "crit": False,
            "life": None,
        },
        {
            "sku": "SKU-SPR-HYDRAULIC",
            "name": "[SYNTHETIC] Anti-Freeze Hydraulic Fluid 20L",
            "category": "Maintenance/Spares",
            "unit": "liters",
            "weight": 18.0,
            "vol": 0.022,
            "crit": False,
            "life": 720,
        },
        # General Supplies
        {
            "sku": "SKU-GEN-EXTREME-TENT",
            "name": "[SYNTHETIC] Arctic Double-Walled Tent",
            "category": "General Supplies",
            "unit": "units",
            "weight": 32.0,
            "vol": 0.095,
            "crit": False,
            "life": None,
        },
        {
            "sku": "SKU-GEN-SLEEP-BAG",
            "name": "[SYNTHETIC] Sub-Zero Sleeping System (-40C)",
            "category": "General Supplies",
            "unit": "units",
            "weight": 3.8,
            "vol": 0.012,
            "crit": True,
            "life": None,
        },
        {
            "sku": "SKU-GEN-BOOTS",
            "name": "[SYNTHETIC] High-Altitude Thermal Combat Boots",
            "category": "General Supplies",
            "unit": "boxes",
            "weight": 2.2,
            "vol": 0.008,
            "crit": False,
            "life": None,
        },
        {
            "sku": "SKU-GEN-HEATING-STOVE",
            "name": "[SYNTHETIC] Pressurized Bukhari Stove Assembly",
            "category": "General Supplies",
            "unit": "units",
            "weight": 15.0,
            "vol": 0.040,
            "crit": True,
            "life": None,
        },
    ]


def get_synthetic_fleet_spec() -> list[dict]:
    """18 synthetic vehicles across 4 functional vehicle classes."""
    types = [
        {"type": "MEDIUM_TRUCK", "prefix": "VEH-MT", "count": 6, "payload": 3500.0, "vol": 14.0},
        {"type": "HEAVY_TRUCK", "prefix": "VEH-HT", "count": 5, "payload": 9000.0, "vol": 32.0},
        {"type": "FUEL_TANKER", "prefix": "VEH-TK", "count": 4, "payload": 7500.0, "vol": 9.5},
        {"type": "UTILITY_VEHICLE", "prefix": "VEH-UV", "count": 3, "payload": 1200.0, "vol": 4.5},
    ]
    vehicles = []
    idx = 1
    for spec in types:
        for i in range(1, spec["count"] + 1):
            vehicles.append(
                {
                    "code": f"{spec['prefix']}-{i:02d}",
                    "type": spec["type"],
                    "payload_kg": spec["payload"],
                    "volume_m3": spec["vol"],
                    "home_code": "LOC-BASE-ALPHA" if idx % 2 == 1 else "LOC-BASE-BRAVO",
                }
            )
            idx += 1
    return vehicles


def get_synthetic_network_connections() -> list[tuple[str, str, float, str]]:
    """
    Connected directed graph topology between base depots, FSDs, and forward posts.
    Returns: (origin_code, destination_code, distance_km, road_type)
    """
    return [
        # Base to FSD arterial corridors
        ("LOC-BASE-ALPHA", "LOC-FSD-NORTH", 85.0, "HIGHWAY"),
        ("LOC-FSD-NORTH", "LOC-BASE-ALPHA", 85.0, "HIGHWAY"),
        ("LOC-BASE-ALPHA", "LOC-FSD-VALLEY", 72.0, "HIGHWAY"),
        ("LOC-FSD-VALLEY", "LOC-BASE-ALPHA", 72.0, "HIGHWAY"),
        ("LOC-BASE-BRAVO", "LOC-FSD-CENTRAL", 94.0, "HIGHWAY"),
        ("LOC-FSD-CENTRAL", "LOC-BASE-BRAVO", 94.0, "HIGHWAY"),
        ("LOC-BASE-BRAVO", "LOC-FSD-EAST", 112.0, "HIGHWAY"),
        ("LOC-FSD-EAST", "LOC-BASE-BRAVO", 112.0, "HIGHWAY"),
        # Lateral FSD connectors (resilience corridors)
        ("LOC-FSD-NORTH", "LOC-FSD-CENTRAL", 55.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-CENTRAL", "LOC-FSD-NORTH", 55.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-CENTRAL", "LOC-FSD-EAST", 48.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-EAST", "LOC-FSD-CENTRAL", 48.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-VALLEY", "LOC-FSD-NORTH", 42.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-NORTH", "LOC-FSD-VALLEY", 42.0, "MOUNTAIN_ROAD"),
        # FSD to Forward Operating Posts
        ("LOC-FSD-NORTH", "LOC-POST-PASS-A", 45.0, "MOUNTAIN_ROAD"),
        ("LOC-POST-PASS-A", "LOC-FSD-NORTH", 45.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-CENTRAL", "LOC-POST-EAGLE", 38.0, "MOUNTAIN_ROAD"),
        ("LOC-POST-EAGLE", "LOC-FSD-CENTRAL", 38.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-CENTRAL", "LOC-POST-SECTOR-X", 52.0, "UNPAVED_TRACK"),
        ("LOC-POST-SECTOR-X", "LOC-FSD-CENTRAL", 52.0, "UNPAVED_TRACK"),
        ("LOC-FSD-EAST", "LOC-POST-PASS-B", 41.0, "MOUNTAIN_ROAD"),
        ("LOC-POST-PASS-B", "LOC-FSD-EAST", 41.0, "MOUNTAIN_ROAD"),
        ("LOC-FSD-EAST", "LOC-POST-GLACIER", 64.0, "UNPAVED_TRACK"),
        ("LOC-POST-GLACIER", "LOC-FSD-EAST", 64.0, "UNPAVED_TRACK"),
        ("LOC-FSD-VALLEY", "LOC-POST-RIVER", 34.0, "MOUNTAIN_ROAD"),
        ("LOC-POST-RIVER", "LOC-FSD-VALLEY", 34.0, "MOUNTAIN_ROAD"),
        # Deep outpost connectors
        ("LOC-POST-PASS-B", "LOC-POST-FRONTIER", 32.0, "UNPAVED_TRACK"),
        ("LOC-POST-FRONTIER", "LOC-POST-PASS-B", 32.0, "UNPAVED_TRACK"),
        ("LOC-POST-GLACIER", "LOC-POST-SUMMIT", 28.0, "UNPAVED_TRACK"),
        ("LOC-POST-SUMMIT", "LOC-POST-GLACIER", 28.0, "UNPAVED_TRACK"),
    ]


class SyntheticDataGenerator:
    """Deterministic generator for SupplyFlow Phase 2 foundation."""

    def __init__(self, seed: int = DEFAULT_SEED):
        self.seed = seed
        self.rng = random.Random(seed)

    def generate_all(self) -> dict[str, list]:
        """Generate all interconnected relational entities."""
        # 1. Locations
        locations_map: dict[str, Location] = {}
        locations_list: list[Location] = []
        for loc_spec in get_synthetic_locations_spec():
            point_geom = Point(loc_spec["lon"], loc_spec["lat"])
            loc = Location(
                code=loc_spec["code"],
                name=loc_spec["name"],
                location_type=loc_spec["location_type"],
                latitude=loc_spec["lat"],
                longitude=loc_spec["lon"],
                coordinates=from_shape(point_geom, srid=4326),
                elevation_m=loc_spec["elevation_m"],
                synthetic_data=True,
                is_active=True,
            )
            locations_map[loc.code] = loc
            locations_list.append(loc)

        # 2. Supply Items
        supplies_map: dict[str, SupplyItem] = {}
        supplies_list: list[SupplyItem] = []
        for s_spec in get_synthetic_supplies_spec():
            item = SupplyItem(
                sku=s_spec["sku"],
                name=s_spec["name"],
                category=s_spec["category"],
                unit=s_spec["unit"],
                unit_weight_kg=s_spec["weight"],
                unit_volume_m3=s_spec["vol"],
                is_critical=s_spec["crit"],
                shelf_life_days=s_spec["life"],
                synthetic_data=True,
                is_active=True,
            )
            supplies_map[item.sku] = item
            supplies_list.append(item)

        # 3. Route Edges
        routes_list: list[RouteEdge] = []
        for origin_code, dest_code, dist_km, r_type in get_synthetic_network_connections():
            orig = locations_map[origin_code]
            dest = locations_map[dest_code]

            # Simple 3-point realistic curved LineString
            mid_lon = (orig.longitude + dest.longitude) / 2.0 + (self.rng.uniform(-0.015, 0.015))
            mid_lat = (orig.latitude + dest.latitude) / 2.0 + (self.rng.uniform(-0.015, 0.015))
            line_geom = LineString(
                [(orig.longitude, orig.latitude), (mid_lon, mid_lat), (dest.longitude, dest.latitude)]
            )

            # Nominal speed based on road type
            nominal_speed = 45.0 if r_type == "HIGHWAY" else (25.0 if r_type == "MOUNTAIN_ROAD" else 15.0)
            travel_time = round(dist_km / nominal_speed, 2)
            slope = round(abs(dest.elevation_m - orig.elevation_m) / (dist_km * 1000.0) * 57.2958, 2)
            max_elev = max(orig.elevation_m, dest.elevation_m) + self.rng.uniform(50.0, 200.0)

            edge = RouteEdge(
                origin_location=orig,
                destination_location=dest,
                route_geometry=from_shape(line_geom, srid=4326),
                distance_km=dist_km,
                nominal_travel_time_hrs=travel_time,
                average_slope_deg=min(slope, 15.0),
                max_elevation_m=max_elev,
                road_type=r_type,
                weather_friction_multiplier=1.0,
                is_blocked=False,
                is_active=True,
                synthetic_data=True,
            )
            routes_list.append(edge)

        # 4. Vehicles
        vehicles_list: list[Vehicle] = []
        for v_spec in get_synthetic_fleet_spec():
            home_loc = locations_map[v_spec["home_code"]]
            veh = Vehicle(
                vehicle_code=v_spec["code"],
                vehicle_type=v_spec["type"],
                home_location=home_loc,
                current_location=home_loc,
                payload_capacity_kg=v_spec["payload_kg"],
                volume_capacity_m3=v_spec["volume_m3"],
                status="AVAILABLE",
                is_active=True,
                synthetic_data=True,
            )
            vehicles_list.append(veh)

        # 5. Inventory
        inventory_list: list[Inventory] = []
        for loc in locations_list:
            for item in supplies_list:
                # Capacity and initial stock determined by echelon
                if loc.location_type == "BASE_DEPOT":
                    max_cap = 50000.0
                    qty = round(self.rng.uniform(25000.0, 42000.0), 1)
                    safety = 8000.0
                elif loc.location_type == "FORWARD_SUPPLY_DEPOT":
                    max_cap = 15000.0
                    qty = round(self.rng.uniform(6000.0, 12000.0), 1)
                    safety = 2500.0
                else:  # FORWARD_POST
                    max_cap = 3000.0
                    qty = round(self.rng.uniform(800.0, 2200.0), 1)
                    safety = 400.0

                reserved = round(qty * self.rng.uniform(0.05, 0.15), 1)

                inv = Inventory(
                    location=loc,
                    item=item,
                    quantity=qty,
                    reserved_quantity=reserved,
                    safety_stock=safety,
                    max_capacity=max_cap,
                )
                inventory_list.append(inv)

        # 6. Historical Consumption Records (180 days ~ 6 months)
        consumption_list: list[ConsumptionRecord] = []
        end_date = datetime.now(UTC).date()
        start_date = end_date - timedelta(days=180)

        # Focus daily consumption generation on forward posts and FSDs
        forward_locations = [
            loc_node
            for loc_node in locations_list
            if loc_node.location_type in ["FORWARD_POST", "FORWARD_SUPPLY_DEPOT"]
        ]

        for loc in forward_locations:
            for item in supplies_list:
                # Base consumption scale
                if item.category == "Fuel/POL":
                    base_consumption = 180.0 if loc.location_type == "FORWARD_POST" else 650.0
                elif item.category == "Food/Rations":
                    base_consumption = 90.0 if loc.location_type == "FORWARD_POST" else 350.0
                elif item.category == "Medical":
                    base_consumption = 6.0 if loc.location_type == "FORWARD_POST" else 25.0
                elif item.category == "Maintenance/Spares":
                    base_consumption = 4.0 if loc.location_type == "FORWARD_POST" else 18.0
                else:
                    base_consumption = 15.0 if loc.location_type == "FORWARD_POST" else 55.0

                current_day = start_date
                day_index = 0

                while current_day <= end_date:
                    # Day of week variation (±8%)
                    dow_factor = 1.0 + 0.08 * math.sin(current_day.weekday() * math.pi / 3.5)

                    # Seasonality: Simulated winter cooling (days 60-150 represent deep winter)
                    winter_intensity = math.sin((day_index / 180.0) * math.pi)
                    temp_c = round(15.0 - (loc.elevation_m / 250.0) - (20.0 * winter_intensity), 1)
                    snow_cm = round(max(0.0, -temp_c * 0.8 + self.rng.uniform(-2.0, 5.0)), 1) if temp_c < -2.0 else 0.0

                    # Weather sensitivity: Diesel & Bukhari kerosene demand surges in cold
                    weather_factor = 1.0
                    if (
                        item.sku in ["SKU-POL-DSL-SUBZERO", "SKU-POL-KEROSENE", "SKU-GEN-HEATING-STOVE"]
                        and temp_c < 0.0
                    ):
                        weather_factor += min(1.2, abs(temp_c) * 0.04)

                    # High altitude factor for oxygen and HAPE kits
                    if item.sku in ["SKU-MED-HAPE", "SKU-MED-OXYGEN"] and loc.elevation_m > 4000.0:
                        weather_factor += 0.35

                    # Controlled slight trend (+0.05% per day)
                    trend_factor = 1.0 + (day_index * 0.0005)

                    # Controlled spike events (e.g. exercise or resupply contingency)
                    spike_factor = 1.45 if (day_index in [45, 110, 160]) else 1.0
                    scenario = (
                        "CONTINGENCY"
                        if spike_factor > 1.0
                        else ("WINTER_STOCKING" if winter_intensity > 0.6 else "ROUTINE")
                    )

                    # Final non-negative consumption quantity
                    noise = self.rng.gauss(1.0, 0.06)
                    consumed = max(
                        0.0,
                        round(base_consumption * dow_factor * weather_factor * trend_factor * spike_factor * noise, 1),
                    )

                    record = ConsumptionRecord(
                        location=loc,
                        item=item,
                        recorded_date=current_day,
                        quantity_consumed=consumed,
                        weather_temp_c=temp_c,
                        snowfall_cm=snow_cm,
                        rainfall_mm=round(self.rng.uniform(0.0, 12.0), 1) if temp_c >= 0.0 else 0.0,
                        operational_scenario=scenario,
                        data_source_type="SIMULATED_DEMAND",
                        synthetic_data=True,
                    )
                    consumption_list.append(record)

                    current_day += timedelta(days=1)
                    day_index += 1

        # 7. Sample Demonstration Shipments (6 representative movements)
        shipments_list: list[Shipment] = []
        shipment_samples = [
            ("SHP-2026-001", "LOC-BASE-ALPHA", "LOC-FSD-NORTH", "VEH-HT-01", "DELIVERED", -48, -40, -40),
            ("SHP-2026-002", "LOC-BASE-BRAVO", "LOC-FSD-CENTRAL", "VEH-HT-02", "DELIVERED", -36, -26, -26),
            ("SHP-2026-003", "LOC-FSD-NORTH", "LOC-POST-PASS-A", "VEH-MT-01", "IN_TRANSIT", -6, 2, None),
            ("SHP-2026-004", "LOC-BASE-ALPHA", "LOC-FSD-VALLEY", "VEH-TK-01", "IN_TRANSIT", -4, 3, None),
            ("SHP-2026-005", "LOC-FSD-CENTRAL", "LOC-POST-EAGLE", "VEH-UV-01", "DISPATCHED", -1, 4, None),
            ("SHP-2026-006", "LOC-FSD-EAST", "LOC-POST-PASS-B", "VEH-MT-02", "PLANNED", 6, 12, None),
        ]

        now = datetime.now(UTC)
        veh_map = {v.vehicle_code: v for v in vehicles_list}

        for (
            code,
            orig_code,
            dest_code,
            v_code,
            status,
            dep_offset_hrs,
            arr_offset_hrs,
            act_offset_hrs,
        ) in shipment_samples:
            orig = locations_map[orig_code]
            dest = locations_map[dest_code]
            veh = veh_map[v_code]

            # Find matching edge
            matching_edge = next(
                (e for e in routes_list if e.origin_location == orig and e.destination_location == dest), None
            )

            dep_time = now + timedelta(hours=dep_offset_hrs)
            est_arr_time = now + timedelta(hours=arr_offset_hrs)
            act_arr_time = (now + timedelta(hours=act_offset_hrs)) if act_offset_hrs is not None else None

            shp = Shipment(
                shipment_code=code,
                origin_location=orig,
                destination_location=dest,
                vehicle=veh,
                route_edge=matching_edge,
                status=status,
                departure_time=dep_time,
                estimated_arrival_time=est_arr_time,
                actual_arrival_time=act_arr_time,
                synthetic_data=True,
            )

            # Add 2-3 manifest items obeying truck capacity
            if "TK" in v_code:  # Fuel tanker carries diesel
                shp.items.append(ShipmentItem(shipment=shp, item=supplies_map["SKU-POL-DSL-SUBZERO"], quantity=7000.0))
            else:
                shp.items.append(ShipmentItem(shipment=shp, item=supplies_map["SKU-RAT-RTE"], quantity=800.0))
                shp.items.append(ShipmentItem(shipment=shp, item=supplies_map["SKU-MED-HAPE"], quantity=150.0))

            shipments_list.append(shp)

        return {
            "locations": locations_list,
            "supply_items": supplies_list,
            "routes": routes_list,
            "vehicles": vehicles_list,
            "inventory": inventory_list,
            "consumption": consumption_list,
            "shipments": shipments_list,
        }
