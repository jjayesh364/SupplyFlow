# SupplyFlow: Predictive Logistics & Forward Supply Chain

> **Smart India Hackathon 2026 — Problem Statement PS 26251**  
> *Predictive Logistics & Forward Supply Chain for High-Altitude & Extreme Terrains*  
> **Development Phase:** Phase 1 — Development Foundation & Infrastructure Setup

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
+-----------------------------------------------------------------------------------------+
```

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
|       |-- app/core/                  # Settings (Pydantic BaseSettings), logging
|       |-- app/db/                    # SQLAlchemy async engine, sessionmaker, health probes
|       |-- app/api/v1/endpoints/      # REST endpoints (/health, /ping)
|       |-- app/schemas/               # Pydantic v2 validation models
|       |-- tests/                     # Pytest suite with FastAPI TestClient
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

## 3. Quickstart & Local Execution

### Option A: Complete Docker Compose Orchestration (Recommended)
Ensure Docker Desktop is running, then execute:

```powershell
# Copy environment configuration
Copy-Item .env.example .env

# Build and start all services (PostGIS + FastAPI + Next.js)
docker compose up --build
```

- **Frontend Dashboard:** [http://localhost:3000](http://localhost:3000)
- **FastAPI OpenAPI Docs:** [http://localhost:8000/docs](http://localhost:8000/docs)
- **Backend Health Probe:** [http://localhost:8000/api/v1/health](http://localhost:8000/api/v1/health)
- **PostGIS Port:** `localhost:5432`

---

### Option B: Local Host Development

#### 1. Backend (FastAPI + Python 3.11/3.13)
```powershell
# Create & activate virtual environment
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1

# Install backend dependencies
pip install -r services/api/requirements.txt

# Run backend linter & tests
ruff check services/api
pytest services/api/tests -v

# Start FastAPI development server
uvicorn app.main:app --app-dir services/api --reload --port 8000
```

#### 2. Frontend (Next.js 15)
```powershell
cd apps/web

# Install dependencies (if not already installed)
npm install

# Run development server
npm run dev
```
Navigate to [http://localhost:3000](http://localhost:3000).

---

## 4. Configurable Parameters

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

## 5. Development Roadmap Progress

- [x] **Phase 0:** Requirements, Architecture Blueprint, Free Data Research, Database ER Design.
- [x] **Phase 1:** Monorepo Skeleton, Docker Compose, PostGIS Config, FastAPI, Next.js, Health Probes, Test Suite.
- [ ] **Phase 2:** PostgreSQL + PostGIS Schema Creation & Synthetic Logistics Data Generator.
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
