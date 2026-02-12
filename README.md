# HerdWatch

**Early-warning and coordination for livestock migration.** Like Google Maps + weather forecast + conflict early warning, made for cattle movement in **South Sudan**.

*“Just as Uber prevents traffic jams through predictive routing, HerdWatch helps prevent violent clashes by forecasting cattle movement and guiding peacekeepers to coordinate safer migration paths in advance.”*

- **Not surveillance.** Environmental signal analysis for prevention only. AI suggests → Peacekeepers communicate → Herders decide.
- **No GPS or individual tracking.** Environmental signals only. Not for enforcement or military use.

## Features (MVP)

- **Prediction layer** – Herds inferred from satellite + vegetation + water; predicted movement over 1–7 days.
- **Risk detection** – Flags when two herds will reach the same resource (proximity) at the same time → conflict probability (medium/high).
- **Movement alerts** – Peacekeeper-facing list: “Herd A & B predicted to converge near [area] in N days. High conflict probability.” With **suggested alternatives** (e.g. “Herd A: shift east; Herd B: delay 2 days”).
- **Risk zones on map** – Red circles where convergence is predicted; layer toggle for herds, trails, risk zones.
- **Time playback** – Slider and play to replay herd positions (past → present).
- **Scenario simulator** – Rainfall, drought, flood, seasonal shift; herds and alerts update in real time.
- **Field briefing export** – PDF with current alerts and suggested actions for field teams. Plus PNG map, PDF summary, GeoJSON.

## Run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Dark mode is default; map is centered on South Sudan.

## Tech

- **Next.js 14** (App Router), **React 18**, **TypeScript**
- **Leaflet** + **react-leaflet** for the map (dark base tiles, no API key)
- **Tailwind CSS** for UI
- **Demo data** – Grid heat scores from the PRD formula; replace with real Sentinel/CHIRPS pipelines for production.

## Data (production path)

PRD inputs: Sentinel-1 (SAR), Sentinel-2 (NDVI), Landsat 8/9, CHIRPS rainfall, surface water, OpenStreetMap. All open-access. This repo uses synthetic herd positions and movement for the simulator UI; plug in your own clustering and movement models (e.g. spatiotemporal clustering, HMM, graph corridors) to drive the same herd/trail visualization and exports.
