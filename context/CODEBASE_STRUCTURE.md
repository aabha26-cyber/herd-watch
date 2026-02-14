# HerdWatch — Codebase Structure & Status

> Current state of the codebase, what's built, what's mock, and what needs real implementation.
>
> **Note (2026-02-14):** This file contains the original structural baseline. For the latest implementation snapshot (including new API routes and real-data integration), see `context/IMPLEMENTATION_STATUS.md`.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 14 (App Router) |
| Language | TypeScript (strict) |
| UI | React 18 + Tailwind CSS (dark mode) |
| Map | Leaflet + react-leaflet (dark tiles, no API key) |
| Export | jsPDF + html2canvas |
| Package Manager | npm |

**Original baseline:** mock-first, mostly client-side architecture.  
**Current reality:** Next.js API routes now exist for environment, conflicts, and status; real-data integration is partially live.

---

## Directory Structure

```
herd-watch/
├── app/                        # Next.js App Router pages
│   ├── page.tsx                # Main dashboard (full simulator)
│   ├── spec-map/page.tsx       # CSI model testing page
│   ├── layout.tsx              # Root layout
│   └── globals.css             # Tailwind globals
│
├── components/                 # React UI components
│   ├── MapInner.tsx            # Core Leaflet map (herds, paths, risk zones, layers)
│   ├── MapView.tsx             # Dynamic import wrapper (SSR-safe)
│   ├── AlertsPanel.tsx         # LEFT panel: risk alerts with severity badges
│   ├── SuggestedActionsPanel.tsx # RIGHT panel: rerouting actions
│   ├── NotifyPanel.tsx         # Peacekeeper notification interface
│   ├── DataUploadPanel.tsx     # GeoJSON/CSV/KML file upload
│   ├── TimeSlider.tsx          # Day 0-4 timeline with playback
│   ├── LayerToggles.tsx        # 11 toggleable map layers
│   ├── ScenarioPanel.tsx       # Rainfall/drought/flood scenario controls
│   ├── CSIModelPanel.tsx       # CSI model visualization
│   ├── ExportPanel.tsx         # Export controls (PNG/PDF/GeoJSON)
│   ├── EthicsDisclaimer.tsx    # Ethics notice banner
│   └── SpecMapInner.tsx        # Spec-only map component
│
├── lib/                        # Core business logic
│   ├── csi.ts                  # Composite Suitability Index formula
│   ├── movement.ts             # Movement prediction engine (8-direction weighted)
│   ├── risk.ts                 # Conflict risk detection + rerouting suggestions
│   ├── envGrid.ts              # Environment grid generation
│   ├── environment.ts          # Environmental layers (water, villages, conflicts)
│   ├── heatScore.ts            # Heat score calculations
│   ├── herds.ts                # Herd data structures and types
│   ├── mockData.ts             # ⚠️ MOCK — synthetic data generators
│   ├── mockFactors.ts          # ⚠️ MOCK — synthetic environmental factors
│   ├── constants.ts            # Geographic bounds, grid config (Jonglei-Bor-Sudd)
│   ├── pois.ts                 # Points of interest (peacekeeping sites, farms)
│   ├── notifications.ts        # Notification system (radio/SMS/email/app)
│   ├── dataUpload.ts           # File parsing for uploads
│   └── export.ts               # Export functions (PNG/PDF/GeoJSON)
│
├── agents/                     # Agent system (planning/research/progress)
│   ├── AGENT_LOG.md            # Auto-generated project log
│   ├── index.ts                # Barrel export
│   ├── planning.ts             # Planning agent
│   ├── progress.ts             # Progress tracking
│   ├── research.ts             # Research agent
│   ├── log.ts                  # Logging system
│   └── types.ts                # Type definitions
│
├── docs/                       # Documentation
│   └── METRICS_AND_SOURCES.md  # CSI model spec (single source of truth)
│
├── context/                    # 📍 YOU ARE HERE — consolidated project context
│
├── public/docs/                # Static copy of metrics doc
│
├── package.json                # Dependencies
├── tsconfig.json               # TypeScript config
├── next.config.js              # Next.js config
├── postcss.config.js           # PostCSS/Tailwind
└── README.md                   # Project readme
```

---

## What's Built (100% Complete)

### M1: Simulator Core Engine

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| CSI Calculator | `lib/csi.ts` | Done | Composite Suitability Index from 8 factors |
| Movement Engine | `lib/movement.ts` | Done | 12 herds, 8-direction weighted scoring, 4-day forecast, 15-25 km/day |
| Risk Detection | `lib/risk.ts` | Done | Convergence + scarcity + village/farmland proximity + conflict history |
| Environment Layers | `lib/environment.ts` | Done | Water bodies (15), villages (20), conflict zones (8) |
| Notification System | `lib/notifications.ts` | Done | 8 peacekeeping sites, 4 channels |
| Data Upload | `lib/dataUpload.ts` | Done | GeoJSON, CSV, KML parsing (client-side) |

### M2: Dashboard UI

| Component | File | Status | Description |
|-----------|------|--------|-------------|
| Map | `components/MapInner.tsx` | Done | Leaflet map with all layers |
| Alerts Panel | `components/AlertsPanel.tsx` | Done | Left sidebar with risk alerts |
| Actions Panel | `components/SuggestedActionsPanel.tsx` | Done | Right sidebar with rerouting |
| Notifications | `components/NotifyPanel.tsx` | Done | Peacekeeper notification UI |
| File Upload | `components/DataUploadPanel.tsx` | Done | Drag-drop file upload |
| Timeline | `components/TimeSlider.tsx` | Done | Day 0-4 playback |
| Layer Toggles | `components/LayerToggles.tsx` | Done | 11 toggleable layers |
| Scenario Sim | `components/ScenarioPanel.tsx` | Done | Rainfall/drought/flood controls |
| Export | `components/ExportPanel.tsx` | Done | PNG/PDF/GeoJSON export |

---

## What's MOCK (Needs Real Data)

These are the files generating synthetic data that must be replaced with real satellite/API data:

| File | What It Mocks | Real Source Needed |
|------|--------------|-------------------|
| `lib/mockData.ts` | Herd positions, movement trails | Satellite imagery cattle camp detection (Sentinel-1/2) |
| `lib/mockFactors.ts` | All 8 environmental factors (NDVI, rainfall, water, soil moisture, ET, LST, floods, geospatial) | CHIRPS, MODIS, Sentinel, SMAP, WaPOR, ACLED, HydroSHEDS, SRTM |
| `lib/herds.ts` | Herd data structures (hardcoded 12 herds) | FAO GLW4 baseline + ONS cattle camp detection model |
| `lib/environment.ts` | Static water bodies, villages, conflict zones | HDX, OSM, ACLED real datasets |
| `lib/pois.ts` | Peacekeeping sites, farm locations | UN OCHA / UNMISS operational data |

### The Interface Contract

The mock data conforms to the same types and ranges defined in `docs/METRICS_AND_SOURCES.md`. This means **real data can be plugged in via the same interfaces** — the UI and prediction engine don't need to change, only the data source layer.

---

## What Needs to Be Implemented Next

### Priority 1: Real Data Pipeline (Backend)

Currently **no backend exists**. Need:

- [ ] **API routes** or serverless functions to fetch satellite data
- [ ] **Google Earth Engine** integration for Sentinel-1/2, MODIS, CHIRPS
- [ ] **ACLED API** integration for conflict event data
- [ ] **HDX/HydroSHEDS** data ingestion for water bodies, roads, admin boundaries
- [ ] **Data caching layer** — satellite data doesn't change minute-to-minute; cache for hours/days
- [ ] **Cron/scheduled jobs** to refresh environmental data periodically

### Priority 2: Cattle Camp Detection

- [ ] **ONS UNET model** adaptation — detect cattle camps from Sentinel-2 imagery
- [ ] **Training data** pipeline — labeled satellite images of known cattle camps
- [ ] **Inference pipeline** — run model on latest imagery, output herd locations

### Priority 3: Historical Data & Validation

- [ ] **Historical migration patterns** database from past seasons
- [ ] **Conflict history** correlation with cattle movement data
- [ ] **Model validation** — compare predictions against known outcomes

### Priority 4: Production Hardening

- [ ] **Authentication** — UN personnel access control
- [ ] **Offline capability** — field tablets with intermittent connectivity
- [ ] **Database** — store predictions, alerts, peacekeeper feedback
- [ ] **Feedback loop** — peacekeepers report outcomes, data feeds back into model
- [ ] **Multi-region support** — parameterize for different countries/landscapes

---

## Key Architectural Decisions

1. **Client-side simulation** — All prediction math runs in the browser. This was intentional for the prototype but should move server-side for production (compute-intensive satellite processing).
2. **No API keys required** — Uses OpenStreetMap tiles and would use Copernicus Open Access for satellite data.
3. **CSI-based movement** — The Composite Suitability Index is the core prediction mechanism. Herds move toward higher CSI scores. This is documented in `docs/METRICS_AND_SOURCES.md`.
4. **Explainable AI** — Every prediction has a breakdown of which factors contributed, making it auditable for UN use.

---

*Last updated: 2026-02-14. Branch: `connect-real-data`.*
