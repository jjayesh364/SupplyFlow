# SupplyFlow: Smart India Hackathon Demonstration Guide

> **Problem Statement PS 26251:** Predictive Logistics & Forward Supply Chain for High-Altitude Sectors  
> **Target Audience:** Hackathon Evaluators, Jury Members & Technical Reviewers  
> **Demonstration Duration:** 5 – 10 Minutes  

---

## Mandatory Notice for Evaluators
> **DEMONSTRATION THEATER — SYNTHETIC LOGISTICS NETWORK**  
> All nodes, coordinates, routes, inventory figures, and convoy dispatches shown in this system are **strictly synthetic simulation data**. This system is an algorithmic decision-support tool designed for extreme terrain logistics planning and does not connect to or represent actual Indian Army deployments.

---

## 12-Step Live Demonstration Walkthrough

```
+-----------------------------------------------------------------------------------------+
|                                DEMONSTRATION WORKFLOW                                   |
|                                                                                         |
|   1. Start Database (PostgreSQL 18 + PostGIS 3.6 on port 5433/5432)                     |
|   2. Start Backend (FastAPI service at http://localhost:8000)                           |
|   3. Start Frontend (Next.js 15 service at http://localhost:3000)                        |
|   4. Open Dashboard (Operations Overview & Readiness HUD)                               |
|   5. Show Network (Interactive Tactical Vector Mesh & MapLibre GL)                      |
|   6. Show Inventory Risk (Days-of-Supply DoS matrix & Urgency Score)                    |
|   7. Show Forecast (Quantile P10/P50/P90 Envelopes & Walk-Forward Validation)            |
|   8. Show Route Planning (Dynamic Slope, Elevation & Weather Friction Multiplier)       |
|   9. Run Optimization (Google OR-Tools Multi-Depot CVRPTW Fleet Dispatch)               |
|  10. Run a What-If Scenario (Blizzard / Pass Severance / Demand Surge)                  |
|  11. Show Recommendation / Alert (Decision-support proposals & rationing warnings)     |
|  12. Explain Synthetic-Data Disclaimer (Strict Public Repo Data Governance)             |
+-----------------------------------------------------------------------------------------+
```

---

### Step 1: Start Database
Verify PostgreSQL + PostGIS is running:
```powershell
docker compose -f infrastructure/docker-compose.yml up -d db
# Or use existing local cluster on port 5433 / 5432
```

### Step 2: Start Backend
In a terminal, launch the FastAPI server:
```powershell
cd services/api
..\..\.venv\Scripts\Activate.ps1
uvicorn app.main:app --port 8000
```
- Verify health: `GET http://localhost:8000/api/v1/health` returns `status: healthy`.
- Interactive Swagger docs: `http://localhost:8000/docs`.

### Step 3: Start Frontend
In a second terminal, launch the Next.js web application:
```powershell
cd apps/web
npm run dev
```

### Step 4: Open Dashboard
- Open browser to **`http://localhost:3000`**.
- Point out the **Persistent Synthetic Simulation Data Banner** at the top.
- Highlight the **Operations Overview** HUD cards:
  - Theater Readiness Index (e.g. 91%)
  - Critical Stockouts Count (DoS < 2.0 days)
  - Stock Warnings (DoS < 5.0 days)
  - Logistics Nodes (14 simulation nodes)
  - Fleet Availability (Configurable simulation classes)

### Step 5: Show Network
- Switch to the **Tactical GIS Map** tab or view the embedded map.
- Demonstrate dual-mode visualization:
  - **Tactical Vector Mesh:** High-contrast topological mesh with mountain elevation contours.
  - **MapLibre Spatial GL:** Full cartographic map layer with GeoJSON lines and points.
- Click on any logistics node (e.g., Base Depot `BD-001` at 1,750m vs Forward Post `FP-005` at 4,680m).
- Show corridor friction styling:
  - Green: Passable corridor.
  - Amber: High friction ($\mu \ge 1.3$) due to sub-zero temperature or steep grade.
  - Red dashed: Snow-pass closure ($> 15$ cm/hr snowfall rate).

### Step 6: Show Inventory Risk
- Navigate to the **Inventory & DoS Risk** tab.
- Explain the core Days-of-Supply formula:
  $$\text{DoS} = \frac{\text{Current On-Hand Stock}}{\text{Projected Daily Demand Rate}}$$
- Point out the configurable threshold rules:
  - **CRITICAL:** $\text{DoS} < 2.0$ days (immediate stockout risk).
  - **WARNING:** $\text{DoS} < 5.0$ days (replenishment buffer).
  - **HEALTHY:** $\text{DoS} \ge 5.0$ days.
- Filter by node type or supply class (`Class I Rations`, `Class III POL`, `Class V Ammunition`, `Class VIII Medical`).
- Explain the **Urgency Score ($0\dots100$)** that ranks posts needing immediate resupply.

### Step 7: Show Forecast
- Navigate to the **Demand Forecasting** tab.
- Highlight the **Walk-Forward Validation Scorecard**:
  - Measured WAPE: **9.15% (0.0915)**, MAE: **11.99 units**, RMSE: **30.94 units**.
  - **Crucial Qualification:** Explicitly note that this 9.15% WAPE is measured strictly on the synthetic demonstration dataset using rolling-origin walk-forward validation (8,880 historical samples). It is not claimed as real-world operational accuracy; actual performance depends on authorized field data.
- Select a forward post and commodity to display the **14-Day Forward Quantile Envelopes**:
  - **$P_{10}$ (Lower Bound):** Minimum baseline burn.
  - **$P_{50}$ (Expected Median):** Primary tactical demand planning target.
  - **$P_{90}$ (Upper Bound):** Surge buffer for winter and high-altitude conditions.
- Show automated explainability tags (e.g. caloric expenditure spikes at $-8^\circ\text{C}$).

### Step 8: Show Route Planning
- Navigate to the **Route Corridors** tab.
- Select Origin (`BD-001`) and Destination (`FP-005` at 4,680m).
- Click **"Analyze Route Corridor"**:
  - In $< 15$ ms, dynamic Dijkstra calculates the optimal path.
  - Displays leg-by-leg elevation deltas ($+1,250$m), slope gradient angle ($8.4^\circ$), and road surfaces (`HIGHWAY`, `MOUNTAIN_ROAD`, `UNPAVED_TRACK`).
  - Displays dynamic Weather Friction ($\mu$) from Open-Meteo with offline climate fallback.
  - Explains why dynamic transit time is substantially longer than flat highway estimates.

### Step 9: Run Optimization
- In **Operations Overview** or **Recommendations**, click **"Solve Optimal Convoy Dispatch"**.
- Google OR-Tools executes the Multi-Depot CVRPTW solver under vehicle capacity limits and the mandatory daylight convoy window (**0600 – 1700 hrs**).
- Generic simulation fleet classes (`HEAVY_CARGO_TRUCK`, `MEDIUM_MOUNTAIN_TRUCK`, `FUEL_TANKER`, `LIGHT_UTILITY_VEHICLE`) are dispatched to high-urgency deficit nodes.
- Inspect the generated shipment manifests and stop sequences in **Convoy Manifests**.

### Step 10: Run a What-If Scenario
- Navigate to the **What-If Simulation** tab.
- Select **"Severe Blizzard / Mountain Storm"** or **"Strategic Pass Landslide / Blockage"**.
- Click **"Run What-If Simulation"**.
- Review the side-by-side **Before (Baseline) vs After (Disruption)** comparative metrics:
  - Critical stockout nodes: Increases from 2 $\rightarrow$ 5 ($\Delta = +3$).
  - Average Days of Supply: Drops from 9.4 $\rightarrow$ 6.1 days ($\Delta = -3.3$).
  - Blocked corridors: $+3$ passes closed due to severe weather.
  - Route friction multiplier: Rises from $1.08x \rightarrow 1.84x$.

### Step 11: Show Recommendation / Alert
- Inspect the automated **Operational Impact Summary** generated by the simulation.
- Review the decision-support proposals:
  - Emergency convoy push recommendations.
  - Forward post consumption rationing advisories.
  - Alternate pass rerouting around impassable corridors.

### Step 12: Explain Synthetic-Data Disclaimer
- Conclude by pointing to the footer and status banner:
  - All locations, routes, and inventories are purely fictional demonstration data.
  - All operational assumptions (daylight transit hours, DoS thresholds, weather cutoffs) are externalized in configuration for defense evaluation.
  - System architecture is modular, production-ready, and fully verified with 29/29 passing tests.

---

## Technical Q&A Cheat Sheet for Evaluators

| Question | Technical Answer |
| :--- | :--- |
| **Q: Where does the elevation data come from?** | Copernicus 30m Global DEM raster processed into grade angles: $R_g = 9.81 \cdot \sin(\theta)$ with road surface friction factors (`HIGHWAY`: 1.0, `MOUNTAIN_ROAD`: 1.25, `UNPAVED_TRACK`: 1.55). |
| **Q: How does weather affect logistics?** | Live Open-Meteo REST API feeds temperature, snowfall, and wind speed. Freezing icing adds up to $+0.6$, snow accumulation adds $+0.12/\text{cm}$, and snowfall $> 15\text{ cm/hr}$ flags passes as impassable. If offline, a deterministic Himalayan climate fallback executes. |
| **Q: How is forecasting evaluated?** | Quantile Gradient-Boosted Trees (`HistGradientBoostingRegressor`) with rolling-origin walk-forward validation across 8,880 historical consumption rows, achieving **9.15% WAPE** on the synthetic dataset (target was $\le 15\%$). Future accuracy on operational data will depend on field telemetry. |
| **Q: How are routes optimized?** | Google OR-Tools multi-depot CVRPTW solver with custom terrain-and-weather impedance matrix, generic vehicle capacity limits, and configurable daylight movement constraints (0600–1700 hrs). |
| **Q: Is any real classified military data used?** | **No.** All entities are strictly procedurally generated synthetic simulation data watermarked with `synthetic_data = TRUE` in the PostgreSQL database. |
