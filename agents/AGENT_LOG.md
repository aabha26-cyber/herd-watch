<!-- AUTO-GENERATED — master log of all agent calls, plans, and research -->
<!-- Last updated: 2026-02-05 -->

# Project Plan: HerdWatch – South Sudan Cattle Movement Intelligence

> Adapt AI-based mapping and predictive modeling frameworks—using open-source satellite imagery and geospatial data—to detect, track, and forecast cattle presence and movement across South Sudan.

Created: 2026-02-05

---

## ✅ M1 – Simulator Core Engine  (100%)

Build the day-based movement prediction engine, environment layers, and conflict detection.

- ✅ **lib/environment.ts** — Static + dynamic environmental layers: vegetation zones, water bodies (15 from HDX/FAO), villages (20 from OSM), conflict zones (8 from ACLED patterns), rainfall/weather
- ✅ **lib/movement.ts** — Day-based weighted movement prediction: vegetation (0.35), water (0.25), weather (0.15), conflict avoidance (0.15), familiar routes (0.10). 12 herds, 15-25 km/day, 4-day forecast
- ✅ **lib/risk.ts** — Enhanced conflict detection: convergence + resource scarcity + village proximity + farmland proximity + historical conflict. Uber-style rerouting suggestions
- ✅ **lib/notifications.ts** — Peacekeeper notification system: 8 recipients, SMS/email/radio/app channels, auto-notify, manual send, priority levels
- ✅ **lib/dataUpload.ts** — Upload any dataset: GeoJSON, CSV (lat/lng), KML parsing. Client-side, no server needed

## ✅ M2 – Dashboard UI  (100%)

Complete visual interface matching the prototype spec.

- ✅ **components/MapInner.tsx** — Full map with: green herd dots, blue predicted paths, red risk zones, yellow alt routes, vegetation heatmap, water bodies, villages, conflict zones, uploaded layers
- ✅ **components/AlertsPanel.tsx** — LEFT panel: risk level badges, location, days-to-conflict, trigger breakdown, suggested actions
- ✅ **components/SuggestedActionsPanel.tsx** — RIGHT panel: Uber-style redirect/delay actions with impact estimates
- ✅ **components/NotifyPanel.tsx** — Peacekeeper notification: auto-notify all stations, manual send to specific recipients, notification log
- ✅ **components/DataUploadPanel.tsx** — Drag-and-drop file upload, layer visibility toggles, remove layers
- ✅ **components/TimeSlider.tsx** — Day 0 to Day 4 prediction timeline with confidence indicator
- ✅ **components/LayerToggles.tsx** — 11 toggle-able layers organized by category
- ✅ **app/page.tsx** — Full layout: alerts LEFT, actions RIGHT, timeline BOTTOM

---

# Architecture: Simulator Components

## Movement Prediction (Explainable AI)

Each herd evaluates 8 compass directions using weighted scoring:

| Factor | Weight | Data Source (Production) |
|--------|--------|------------------------|
| Vegetation quality | 0.35 | MODIS NDVI / Sentinel-2 |
| Water proximity | 0.25 | JRC Global Surface Water |
| Weather/rainfall | 0.15 | CHIRPS 2.0 |
| Conflict avoidance | 0.15 | ACLED events |
| Familiar route | 0.10 | Historical movement data |

Herds move 15–25 km/day toward the highest-scoring area.

## Conflict Risk Triggers

A risk alert fires when ALL conditions met:
1. Two predicted herd paths converge within 40 km
2. Resource availability (vegetation OR water) below 35%
3. Area is near village (<30km) OR farmland (<20km) OR has conflict history

## Peacekeeper Notification Channels

| Channel | Use Case |
|---------|----------|
| Radio | Field patrols, outposts |
| SMS | Officers without app access |
| Email | Command staff, humanitarian coordinators |
| App | Push notifications to field tablets |

## Data Upload Support

| Format | Detection | Features |
|--------|-----------|----------|
| GeoJSON | .geojson, .json | Full geometry support |
| CSV | .csv (lat/lng columns) | Auto-detect column names |
| KML | .kml | Points, lines, polygons |

---

# Research Catalogue

**Datasets:** 17  ·  **Findings:** 3

## Satellite Imagery

| # | Dataset | Provider | Resolution | Cadence | Maps To |
|---|---------|----------|------------|---------|---------|
| P1 | **Sentinel-2 L2A** | ESA / Copernicus | 10 m optical | 5-day revisit | `ndviDecline` |
| P2 | **Sentinel-1 SAR GRD** | ESA / Copernicus | 10 m C-band radar | 6-day revisit | `radarDisturbance` |
| P5 | **Landsat 8/9** | USGS | 30 m optical | 16-day revisit | `ndviDecline` |

## Vegetation

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P1 | **MODIS NDVI (MOD13A2)** | NASA | 250m–1km | `vegetationAt()` |

## Climate

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P1 | **CHIRPS 2.0** | UCSB | ~5km | `rainfallAnomaly` |
| P3 | **MODIS LST (MOD11A2)** | NASA | 1km | `droughtSeverity` |

## Water

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P1 | **JRC Global Surface Water** | EC JRC | 30m | `waterAt()` |
| P4 | **HydroSHEDS** | WWF | 500m–1km | `distanceToWater` |

## Livestock Baseline

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P1 | **ONS Cattle Camp Predictions** | UK ONS | ~10m | Ground truth labels |
| P2 | **FAO GLW4** | FAO | ~10km | Herd placement prior |

## Conflict & Humanitarian

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P2 | **ACLED** | ACLED | Point events | `conflictHistoryAt()` |
| P3 | **IPC Food Security** | IPC | Admin-2 | Risk weighting |

## Infrastructure

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P4 | **OSM Roads (HDX)** | HOT/OSM | Vector | Movement corridors |
| P5 | **SRTM DEM** | NASA/ESA | 30m | Terrain constraints |

## Flood

| # | Dataset | Provider | Resolution | Maps To |
|---|---------|----------|------------|---------|
| P3 | **Copernicus EMS** | Copernicus | ~20m | `floodExtent` |
| P4 | **MODIS NRT Flood** | NASA LANCE | 250m | `floodExtent` |

---

## Research Findings

### Finding 1: ONS UNET Model for Cattle Camp Detection
The UK ONS demonstrated UNET CNNs detecting cattle camps from Sentinel-2 in South Sudan. This is the most directly applicable prior work.
- Source: datasciencecampus.ons.gov.uk

### Finding 2: HeatScore Maps to Real Datasets
The simulator's weighted scoring formula maps cleanly onto real open-source datasets.

### Finding 3: HDX South Sudan Data Richness
HDX (data.humdata.org) hosts extensive South Sudan datasets: rivers (FAO), roads (OSM), admin boundaries (OCHA), populated places (OSM), IPC food security. All freely downloadable in GeoJSON/Shapefile.
- Source: data.humdata.org/group/ssd

---

# Agent Call Log

| # | Timestamp | Agent | Action |
|---|-----------|-------|--------|
| 1 | 2026-02-05 | planning | initDefaultPlan — 5 milestones, 24 tasks |
| 2 | 2026-02-05 | research | loadCuratedDatasets — 17 datasets |
| 3 | 2026-02-05 | planning | completeM1 — Core engine built |
| 4 | 2026-02-05 | planning | completeM2 — Dashboard UI complete |
| 5 | 2026-02-05 | research | addFinding — HDX data richness |
| 6 | 2026-02-05 | progress | build — Next.js production build successful |
