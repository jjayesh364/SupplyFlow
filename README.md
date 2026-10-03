# SupplyFlow: Predictive Logistics & Forward Supply Chain

> **Smart India Hackathon 2026 — Problem Statement PS 26251**  
> *Predictive Logistics & Forward Supply Chain for High-Altitude & Extreme Terrains*  
> **Development Phase:** Phase 2 — Database Schema + Synthetic Indian Logistics Data Generator

---

## ⚠️ Important Data Governance Notice

```
+-----------------------------------------------------------------------------------------+
|                  DEMONSTRATION THEATER — SYNTHETIC LOGISTICS NETWORK                    |
|                                                                                         |
|  All operational bases, forward posts, inventory figures, consumption records,          |
|  vehicle movements, routes, and alerts in this prototype are STRICTLY SYNTHETIC         |
|  SIMULATION DATA.                                                                       |
|                                                                                         |
|  This system does NOT fabricate, represent, or connect to any actual Indian Army        |
|  operational databases, live troop deployments, or classified defense logistics routes.  |
|  Every database record is explicitly watermarked with synthetic_data = TRUE.             |
+-----------------------------------------------------------------------------------------+
```

### Public Repository Data Safety & Governance Principles
- **Fictional Demonstration Nodes:** All locations in this repository are fictional simulation points. Names such as *Base Depot*, *Forward Supply Depot (FSD)*, and *Forward Post* are logical simulation roles only.
- **Coordinates Disclaimer:** Latitude, longitude, and elevation coordinates represent mathematical demonstration terrain only and must **NOT** be interpreted as actual Indian Army installations or tactical positions.
- **Synthetic Quantities & Assets:** All inventory levels, safety stock thresholds, vehicle fleets, convoy manifests, and consumption records are procedurally generated simulation data.
- **Synthetic Corridors:** All route edges and graph connections are synthetic road corridors created for algorithmic testing.
- **No Sensitive or Operational Data:** Absolutely **no** classified, restricted, sensitive, or real-world operational Indian Army data is included in this repository. All models run on open-source algorithms and open synthetic/public GIS reference data.

---

## 1. System Overview

SupplyFlow is an autonomous, explainable, closed-loop **Predictive Logistics Decision-Support System (DSS)**. It integrates:
1. **Predictive Consumption Forecasting (ML):** Item-level forward demand forecasting using gradient-boosted trees and statistical baselines with TreeSHAP explainability.
2. **Deterministic & Predictive Inventory Risk Engine:** Dynamic Days-of-Supply ($\text{DoS}$), safety stock deficit alerts, and stockout date prediction.
3. **Terrain & Weather-Aware GIS Routing:** Dynamic road friction engine modeling elevation gradient (Copernicus DEM) and weather degradation (Open-Meteo).
4. **Constrained Fleet & Supply Allocation (Google OR-Tools):** Multi-Depot Capacitated Vehicle Routing Problem with Time Windows (MD-CVRPTW-P) prioritizing high-risk forward posts.
5. **Interactive What-If Simulation Engine:** Stress-testing supply chains under road blockages, extreme blizzards, and demand surges.

---

## 2. Monorepo Repository Structure

```
SupplyFlow/
|-- apps/
|   `-- web/                           # Next.js 15 + TypeScript + Tailwind CSS Frontend
|       |-- src/app/                   # App Router (Operations Dashboard & Diagnostics)
|       |-- src/components/            # UI components, StatusBanner, Header
|       |-- src/lib/                   # Typed API client
|       |-- src/types/                 # TypeScript interfaces matching backend schemas
|       `-- package.json               # Frontend dependencies
|-- services/
|   `-- api/                           # FastAPI Python Backend Service
|       |-- alembic/                   # Alembic database migration scripts
|       |   `-- versions/              # Initial schema migration (74181405c1b2)
|       |-- app/core/                  # Settings (Pydantic BaseSettings), logging
|       |-- app/db/                    # SQLAlchemy async & sync engines, sessionmaker, health probes
|       |   |-- base.py                # DeclarativeBase with UUID & timestamp conventions
|       |   |-- seed.py                # Database population orchestration script
|       |   `-- synthetic_generator.py # Reproducible Indian logistics data generator (Seed=42)
|       |-- app/models/                # SQLAlchemy ORM models (11 core models, 14 tables)
|       |   |-- location.py            # Locations with PostGIS POINT geometry (SRID 4326)
|       |   |-- supply.py              # Supply catalog commodities across 5 classes
|       |   |-- inventory.py           # On-hand & reserved stock with check constraints
|       |   |-- consumption.py         # 180-day consumption history with weather covariates
|       |   |-- vehicle.py             # 4 fleet vehicle classes with payload & volume capacities
|       |   |-- route.py               # Road corridors with PostGIS LINESTRING geometry
|       |   |-- shipment.py            # Transit movements & itemized cargo manifests
|       |   |-- forecast.py            # ML demand forecasts & quantile intervals (P10/P50/P90)
|       |   |-- alert.py               # Stockout & weather risk notifications
|       |   `-- optimization.py        # OR-Tools dispatch plans & recommended actions
|       |-- app/schemas/               # Pydantic v2 validation models
|       |-- app/api/v1/endpoints/      # REST API endpoints (locations, supplies, inventory, vehicles, routes, shipments)
|       |-- tests/                     # 20 automated tests (models, spatial queries, endpoints, invariants)
|       |-- ruff.toml                  # Linting & formatting configuration
|       `-- requirements.txt           # Python backend dependencies
|-- data/
|   |-- synthetic/                     # Seed datasets for demonstration nodes & supplies
|   |-- terrain/                       # Pre-clipped 30m Digital Elevation Models (DEM)
|   `-- geojson/                       # Road networks & boundary geometries
|-- infrastructure/
|   |-- docker/                        # Dockerfiles (API & Web) + init-postgis.sql
|   `-- docker-compose.yml             # Single-command local orchestration
|-- docs/
|   `-- architecture/                  # SYSTEM_ARCHITECTURE_BLUEPRINT.md
|-- .env.example                       # Environment configuration template
|-- .gitignore                         # Monorepo ignore rules
`-- README.md                          # Project documentation
```

---

## 3. Database Architecture & Schema (PostgreSQL 18 + PostGIS 3.6)

The SupplyFlow database schema consists of 14 tables with native spatial geometry support and check constraints:

| Table Name | Spatial Type / SRID | Key Columns & Constraints | Purpose |
| :--- | :--- | :--- | :--- |
| `locations` | `POINT` (4326) | `code` (UQ), `location_type`, `elevation_m` | Depots (Base, FSD) and Forward Posts |
| `supply_items` | N/A | `sku` (UQ), `category`, `unit_weight_kg`, `unit_volume_m3` | Standardized military logistics catalog |
| `inventories` | N/A | `chk_inventory_quantity_non_negative`, `chk_inventory_reserved_non_negative` | Current on-hand stock and safety levels |
| `consumption_records` | N/A | `uq_consumption_loc_item_date`, `weather_temp_c`, `snowfall_cm` | 180-day time-series with weather covariates |
| `vehicles` | N/A | `vehicle_code` (UQ), `payload_capacity_kg`, `volume_capacity_m3` | Fleet assets across 4 vehicle classes |
| `route_edges` | `LINESTRING` (4326) | `chk_route_distance_positive`, `chk_route_friction_gte_one` | Road network segments with friction multipliers |
| `shipments` | N/A | `shipment_code` (UQ), `status`, `departure_time` | In-transit and scheduled supply convoys |
| `shipment_items` | N/A | `chk_shipment_item_quantity_positive` | Itemized manifest cargo quantities |
| `demand_forecasts` | N/A | `uq_forecast_loc_item_date_model`, `p10`, `p50`, `p90` | ML predictions with prediction intervals |
| `alerts` | N/A | `alert_type`, `severity`, `is_acknowledged` | Stockout risk, weather blockage, and friction warnings |
| `optimization_runs` | N/A | `objective_value`, `solver_status`, `solve_time_ms` | OR-Tools CVRPTW solver execution runs |
| `recommendations` | N/A | `recommendation_type`, `status`, `details` (JSONB) | Dispatch and rationing recommendations |

---

## 4. Synthetic Indian Logistics Demonstration Dataset

To satisfy strict operational security requirements, all demonstration data is procedurally generated using a deterministic random seed (`seed = 42`):

- **Geographic Theater:** High-altitude Himalayan demonstration corridor (Lat 32.2°N – 34.6°N, Lon 76.3°E – 78.4°E, Elevations 1,650m – 4,790m).
- **14 Demonstration Nodes:**
  - 2 Base Depots (Echelon 1): `LOC-BASE-ALPHA`, `LOC-BASE-BRAVO`
  - 3 Forward Supply Depots (Echelon 2): `LOC-FSD-NORTH`, `LOC-FSD-CENTRAL`, `LOC-FSD-VALLEY`
  - 9 Forward Posts (Echelon 3): `LOC-POST-GLACIER-A`, `LOC-POST-PASS-B`, `LOC-POST-SUMMIT`, etc.
- **20 Supply Items:** Across 5 categories (`Food/Rations`, `Fuel/POL`, `Medical`, `Maintenance/Spares`, `General Supplies`).
- **30 Directed Route Corridors:** Directed graph edges with accurate line strings, road types, and slope profiles.
- **18 Fleet Vehicles:** Medium Trucks (4x4), Heavy Trucks (6x6), Sub-Zero Fuel Tankers, Utility 4x4s.
- **280 Initial Inventory Records:** Complete baseline stock distribution across all nodes and items.
- **43,440 Historical Consumption Records:** 180 continuous daily records across 12 forward nodes $\times$ 20 items, with realistic temperature correlation and winter surge coefficients.
- **6 Realistic Active Shipments:** Representing in-transit, planned, and delivered supply movements.

---

## 5. Quickstart & Local Execution

### 1. Database Migrations & Data Seeding
```powershell
# Navigate to services/api and activate Python venv
cd services/api
..\..\.venv\Scripts\Activate.ps1

# Run Alembic migrations to create tables and PostGIS spatial indexes
alembic upgrade head

# Seed synthetic demonstration logistics network
python -m app.seed
```

### 2. Run Automated Verification Tests
```powershell
# Run the 20-test automated verification suite
pytest tests -v
```

### 3. Start API Service
```powershell
# Launch FastAPI backend with uvicorn
uvicorn app.main:app --reload --port 8000
```

- **OpenAPI Interactive Documentation:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Logistics Nodes Endpoint:** `GET /api/v1/locations`
- **Supply Catalog Endpoint:** `GET /api/v1/supplies`
- **Inventory Stock Endpoint:** `GET /api/v1/inventory`
- **Fleet Vehicles Endpoint:** `GET /api/v1/vehicles`
- **Road Corridors Endpoint:** `GET /api/v1/routes`
- **Active Shipments Endpoint:** `GET /api/v1/shipments`

---

## 6. Configurable Parameters

All operational assumptions are externalized in `.env` and can be adjusted without modifying engine logic:

| Parameter | Default | Description |
| :--- | :--- | :--- |
| `DEFAULT_DOS_CRITICAL_THRESHOLD_DAYS` | `2.0` | Days of Supply below which forward post flags CRITICAL stockout risk |
| `DEFAULT_DOS_WARNING_THRESHOLD_DAYS` | `5.0` | Days of Supply below which forward post flags WARNING status |
| `CONVOY_DAYLIGHT_START_HOUR` | `6` | Start of daylight transit window (06:00 hrs) |
| `CONVOY_DAYLIGHT_END_HOUR` | `17` | End of daylight transit window (17:00 hrs) |
| `MAX_ROAD_PASSABLE_SNOW_CM_HR` | `15.0` | Snowfall rate threshold above which road corridors are marked blocked |
| `DEFAULT_SOLVER_TIME_LIMIT_SECONDS` | `5.0` | Maximum solver execution budget for OR-Tools CVRPTW optimizer |

---

## 7. Development Roadmap Progress

- [x] **Phase 0:** Requirements, Architecture Blueprint, Free Data Research, Database ER Design.
- [x] **Phase 1:** Monorepo Skeleton, Docker Compose, PostGIS Config, FastAPI, Next.js, Health Probes, Test Suite.
- [x] **Phase 2:** PostgreSQL + PostGIS Schema Creation & Synthetic Logistics Data Generator.
- [ ] **Phase 3:** OpenStreetMap & Copernicus DEM Elevation GIS Ingestion.
- [ ] **Phase 4:** ML Demand Forecasting Engine (Statistical Baselines vs. XGBoost).
- [ ] **Phase 5:** Deterministic & Dynamic Inventory Risk Engine.
- [ ] **Phase 6:** Dynamic Terrain-and-Weather-Aware GIS Routing.
- [ ] **Phase 7:** Google OR-Tools Multi-Depot CVRPTW Supply Allocation.
- [ ] **Phase 8:** Open-Meteo Weather Integration & Local Offline Cache.
- [ ] **Phase 9:** Dynamic Simulation Engine & What-If Scenarios.
- [ ] **Phase 10:** MapLibre GL JS Operational Tactical Planning UI.
- [ ] **Phase 11:** Full System Integration & WebSocket Live Feeds.
- [ ] **Phase 12:** End-to-End Validation & Constraint Verification.
- [ ] **Phase 13:** Performance Optimization & Air-Gap Hardening.
- [ ] **Phase 14:** Final SIH Demonstration Packaging & Jury Runbooks.
