# HerdWatch — Real Data Integration Plan

> Step-by-step plan to replace mock data with real satellite, climate, and conflict data sources.

---

## Current State

The app runs entirely on **mock/synthetic data** generated in `lib/mockData.ts` and `lib/mockFactors.ts`. The mock data conforms to the same types and ranges as real data (documented in `docs/METRICS_AND_SOURCES.md`), so the **UI and prediction engine don't need to change** — only the data source layer.

The branch `connect-real-data` is already checked out and ready for this work.

---

## Phase 1: Environment Data Layer (Free, Open-Source APIs)

**Goal:** Replace `lib/mockFactors.ts` with real environmental data for the Jonglei-Bor-Sudd corridor.

### 1A. Rainfall — CHIRPS 2.0

| Detail | Value |
|--------|-------|
| **Source** | UCSB Climate Hazards Group |
| **Access** | Google Earth Engine: `UCSB-CHG/CHIRPS/DAILY` |
| **Alt Access** | Direct download: `data.chc.ucsb.edu/products/CHIRPS-2.0/` |
| **Resolution** | ~5km (0.05°) |
| **Cadence** | Daily |
| **Format** | GeoTIFF rasters |
| **Maps to** | `rainfallIndex` in CSI (Low <5mm/day → 0.2, Moderate 5-20mm → 0.8, High >20mm → 0.3) |

**Implementation:**
1. Create `lib/data/chirps.ts` — fetch daily rainfall for South Sudan bounding box
2. Add Next.js API route `app/api/rainfall/route.ts` to proxy/cache requests
3. Parse GeoTIFF → extract values for grid cells → normalize to 0-1 index
4. Cache for 24 hours (rainfall doesn't change minute-to-minute)

### 1B. Vegetation/NDVI — MODIS + Sentinel-2

| Detail | Value |
|--------|-------|
| **Source** | NASA MODIS (MOD13A2) / ESA Sentinel-2 |
| **Access** | GEE: `MODIS/061/MOD13A2` (16-day, 1km) or `COPERNICUS/S2_SR_HARMONIZED` (5-day, 10m) |
| **Alt Access** | NASA Earthdata: `lpdaac.usgs.gov`, Digital Earth Africa |
| **Maps to** | `ndviIndex` in CSI (Low <0.2 → 0.1, Moderate 0.2-0.5 → 0.6, High >0.5 → 1.0) |

**Implementation:**
1. Create `lib/data/ndvi.ts` — fetch latest NDVI composite
2. MODIS for broad coverage (1km), Sentinel-2 for zoomed-in detail (10m)
3. Normalize raw NDVI (0-1 scale) → CSI index using documented thresholds
4. Cache for 5-16 days depending on source cadence

### 1C. Water Bodies — JRC Global Surface Water

| Detail | Value |
|--------|-------|
| **Source** | EC Joint Research Centre |
| **Access** | GEE: `JRC/GSW1_4/MonthlyHistory` |
| **Alt Access** | `global-surface-water.appspot.com` |
| **Resolution** | 30m |
| **Maps to** | `waterIndex` in CSI + `distanceToWater` in geospatial sub-factor |

**Implementation:**
1. Create `lib/data/water.ts` — fetch monthly water extent
2. Calculate percentage water coverage per grid cell
3. Compute distance-to-nearest-water for each cell using HydroSHEDS rivers
4. Replace hardcoded water bodies in `lib/environment.ts`

### 1D. Soil Moisture — SMAP

| Detail | Value |
|--------|-------|
| **Source** | NASA SMAP |
| **Access** | GEE: `NASA/SMAP/SPL3SMP/009` |
| **Resolution** | 36km (enhanced to 9km) |
| **Cadence** | 3-day |
| **Maps to** | `soilMoistureIndex` (Low <0.12 m³/m³ → 0.2, Moderate 0.12-0.26 → 0.7, High >0.26 → 0.4) |

### 1E. Land Surface Temperature — MODIS

| Detail | Value |
|--------|-------|
| **Source** | NASA MODIS (MOD11A1) |
| **Access** | GEE: `MODIS/061/MOD11A1` |
| **Resolution** | 1km |
| **Cadence** | Daily |
| **Maps to** | `lstIndex` (Low <25°C → 1.0, Moderate 25-30°C → 0.7, High >30°C → 0.4) |

### 1F. Evapotranspiration — MODIS / WaPOR

| Detail | Value |
|--------|-------|
| **Source** | NASA MODIS (MOD16A2) or FAO WaPOR |
| **Access** | GEE: `MODIS/061/MOD16A2` or `FAO/WAPOR/2/L1_AETI_D` |
| **Maps to** | `etIndex` (Low <2mm/day → 0.9, Moderate 2-5mm → 0.6, High >5mm → 0.3) |

### 1G. Flood Extent — MODIS NRT + Copernicus EMS

| Detail | Value |
|--------|-------|
| **Source** | NASA LANCE (near-real-time) + Copernicus Emergency Management Service |
| **Access** | NASA LANCE NRT; GEE flood collections |
| **Resolution** | 250m (MODIS) / ~20m (Copernicus) |
| **Maps to** | `floodIndex` (Low <5% → 1.0, Moderate 5-10% → 0.5, High >10% → 0.1) |

### 1H. Elevation/Terrain — SRTM DEM

| Detail | Value |
|--------|-------|
| **Source** | NASA/ESA SRTM + Copernicus DEM |
| **Access** | GEE: `USGS/SRTMGL1_003` or `COPERNICUS/DEM/GLO30` |
| **Resolution** | 30m |
| **Maps to** | `elevationIndex` in geospatial sub-factor |

---

## Phase 2: Conflict & Humanitarian Data

**Goal:** Replace hardcoded conflict zones with real incident data.

### 2A. ACLED Conflict Events

| Detail | Value |
|--------|-------|
| **Source** | Armed Conflict Location & Event Data |
| **Access** | `acleddata.com/curated-data-files/` (free registration required) |
| **API** | REST API with country/date filters |
| **Format** | CSV/JSON with lat/lng, date, event type, fatalities |
| **Maps to** | `conflictIndex` in geospatial (0 incidents/mo → 1.0, 1-5 → 0.5, >5 → 0.1) |

**Implementation:**
1. Register for ACLED API key
2. Create `lib/data/acled.ts` — fetch South Sudan events for last 6 months
3. Aggregate to grid cells: count incidents per month per area
4. Normalize to 0-1 index
5. Update `lib/environment.ts` conflict zones dynamically

### 2B. HDX South Sudan Datasets

| Detail | Value |
|--------|-------|
| **Source** | Humanitarian Data Exchange |
| **Access** | `data.humdata.org/group/ssd` |
| **Datasets** | Rivers (FAO), roads (OSM), admin boundaries (OCHA), populated places, IPC food security |
| **Format** | GeoJSON, Shapefile |

**Implementation:**
1. Download and cache key shapefiles as static GeoJSON
2. Replace hardcoded villages in `lib/environment.ts` with real populated places
3. Add road network for movement corridor constraints
4. Add admin boundaries for regional context

---

## Phase 3: Cattle Camp Detection (AI/ML Pipeline)

**Goal:** Detect actual cattle herd locations from satellite imagery.

### 3A. ONS UNET Model Adaptation

The UK Office for National Statistics demonstrated **UNET CNNs detecting cattle camps from Sentinel-2 imagery** in South Sudan — the most directly applicable prior work.

| Detail | Value |
|--------|-------|
| **Reference** | `datasciencecampus.ons.gov.uk` — Detecting Cattle Camps in South Sudan |
| **Model** | UNET (semantic segmentation) |
| **Input** | Sentinel-2 10m optical tiles |
| **Output** | Binary mask of cattle camp locations |
| **Training data** | Labeled satellite images of known camps |

**Implementation:**
1. Reproduce ONS UNET model with their published methodology
2. Set up inference pipeline: Sentinel-2 tile → model → herd location points
3. Create `lib/data/cattleDetection.ts` to serve detected locations
4. Run on schedule (every 5 days when new Sentinel-2 data arrives)
5. Replace `lib/herds.ts` hardcoded positions with detected locations

### 3B. FAO GLW4 Baseline

| Detail | Value |
|--------|-------|
| **Source** | FAO Gridded Livestock of the World v4 |
| **Access** | `data.apps.fao.org/catalog/dataset/glw` |
| **Resolution** | ~10km |
| **Use** | Prior distribution for herd density — where cattle *should* be as a baseline |

---

## Phase 4: Google Earth Engine Integration

**Goal:** Centralize satellite data access through GEE as the primary data pipeline.

### Why GEE?

- **Single API** for all major datasets (Sentinel, MODIS, CHIRPS, SMAP, SRTM)
- **Server-side processing** — compute NDVI, aggregate rainfall, etc. without downloading raw imagery
- **Free for research/non-commercial use** (perfect for UN project)
- **JavaScript + Python client libraries**

### Implementation Approach

```
Option A: GEE JavaScript API → Next.js API Routes
──────────────────────────────────────────────────
Client (React) → Next.js API Route → GEE REST API → Processed data
                                          ↓
                                    Cache (file/Redis)

Option B: GEE Python API → Separate microservice
──────────────────────────────────────────────────
Client (React) → Python FastAPI → GEE Python SDK → Processed data
                                          ↓
                                    Cache (file/Redis)
```

**Recommended: Option A** — keeps everything in the Next.js monolith, simpler deployment.

### GEE Setup Steps

1. Create Google Cloud project + enable Earth Engine API
2. Create service account with Earth Engine access
3. Install `@google/earthengine` npm package or use REST API
4. Create `lib/data/gee.ts` — authenticated GEE client
5. Create per-factor modules that query GEE and return normalized indices
6. Add caching layer (environment data valid for hours/days)

---

## Phase 5: Production Architecture

### Proposed Stack Addition

```
Current:   Next.js (client-only, mock data)
                     ↓
Target:    Next.js + API Routes + GEE + ACLED API + Neon/Postgres
           ├── /api/environment  → GEE (all 8 factors)
           ├── /api/conflicts    → ACLED (real-time events)
           ├── /api/herds        → ONS UNET model output
           ├── /api/predictions  → CSI + movement engine (server-side)
           └── /api/feedback     → Peacekeeper outcome reports
```

### Data Refresh Schedule

| Data Type | Source | Refresh Rate | Cache TTL |
|-----------|--------|-------------|-----------|
| Rainfall | CHIRPS | Daily | 24h |
| NDVI | MODIS | 16-day composite | 7 days |
| NDVI (detail) | Sentinel-2 | 5-day | 3 days |
| Water extent | JRC | Monthly | 14 days |
| Soil moisture | SMAP | 3-day | 2 days |
| LST | MODIS | Daily | 24h |
| ET | MODIS/WaPOR | 8-day/10-day | 5 days |
| Flood extent | LANCE NRT | Daily | 12h |
| Conflict events | ACLED | Weekly | 7 days |
| Cattle camps | Sentinel-2 + UNET | 5-day | 3 days |
| Terrain/DEM | SRTM | Static | Forever |
| Water bodies (rivers) | HydroSHEDS | Static | Forever |

---

## Implementation Order (Recommended)

### Sprint 1: Foundation (Week 1-2)
1. Set up Google Earth Engine credentials + authenticated client
2. Create `app/api/` route structure
3. Implement CHIRPS rainfall data fetch + cache
4. Implement MODIS NDVI fetch + cache
5. Wire rainfall + NDVI into `lib/mockFactors.ts` as real data sources (with fallback to mock)

### Sprint 2: Full Environment Layer (Week 3-4)
6. Add remaining 6 factors (water, soil moisture, LST, ET, flood, terrain)
7. Replace `lib/mockFactors.ts` entirely with `lib/data/` modules
8. Load real conflict data from ACLED
9. Load real water bodies + villages from HDX
10. Validate CSI calculations against real data ranges

### Sprint 3: Cattle Detection (Week 5-6)
11. Reproduce ONS UNET pipeline (may need Python microservice)
12. Process Sentinel-2 tiles for Jonglei-Bor-Sudd region
13. Generate herd location points from model output
14. Replace `lib/herds.ts` mock positions with detected locations
15. Validate movement predictions against known patterns

### Sprint 4: Production Hardening (Week 7-8)
16. Add authentication (UN personnel access)
17. Set up Neon/Postgres for storing predictions, alerts, feedback
18. Implement peacekeeper feedback loop
19. Add offline capability for field tablets
20. Load testing + error handling for satellite API failures

---

## Quick Wins (Can Do Today)

These require **no ML model** and use freely downloadable data:

1. **ACLED conflict data** — Download CSV from `acleddata.com`, filter for South Sudan, replace hardcoded conflict zones
2. **HDX populated places** — Download from `data.humdata.org/group/ssd`, replace hardcoded villages
3. **HDX rivers/roads** — Download GeoJSON, add as real map layers
4. **FAO GLW4** — Download cattle density grid, use as herd placement prior

---

*Last updated: 2026-02-13. See `docs/METRICS_AND_SOURCES.md` for the full CSI model spec and factor definitions.*
