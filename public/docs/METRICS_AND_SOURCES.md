# Cattle Movement Prediction Model — Metrics, Indices & Data Sources

This document is the **single source of truth** for the HerdWatch cattle movement model. It defines factor rankings (1–10), numerical ranges, normalized indices (0–1), influence on movement, likelihood percentages, the Composite Suitability Index (CSI) formula, and data source URLs for reference. **The simulator uses mock data only (no APIs).** All mock values conform to the ranges and formulas below; real data can be plugged in later via the same interfaces.

---

## 1. Factor Influence Rankings (Scale 1–10, 10 = Most Influential)

| Rank | Factor | Rationale |
|------|--------|-----------|
| **10** | Vegetation Health / Forage Availability / NDVI | Primary driver; cattle move to areas with better forage. NDVI correlates with biomass and herd mobility resilience. |
| **9** | Geospatial Layers (water proximity, elevation, conflict zones) | Sub-factors: water=9, elevation=8, conflicts=10. Conflicts override environmental factors; water/elevation guide seasonal paths. |
| **9** | Rainfall | Drives flooding (wet season → high ground) and drought (dry season → water). Erratic patterns exacerbate resource scarcity. |
| **9** | Water Bodies / Surface Water Extent | Essential for drinking; herds migrate to reliable sources in dry periods. |
| **8** | Flood Extent / Inundation Mapping | Herds avoid flooded lowlands; floods trigger mass movement to higher ground. |
| **8** | Soil Moisture Index | Influences vegetation growth and water retention; low moisture prompts movement to moister areas. |
| **7** | Evapotranspiration | High rates increase water stress; indirectly pushes herds to cooler/wetter zones. |
| **6** | Land Surface Temperature | Cattle stress >30°C; herds seek cooler elevations but less dominant than water/forage. |

**Weights for CSI:** `Weight_i = Rank_i / 10` (e.g. NDVI=1.0, Geospatial=0.9, Rainfall=0.9, Water=0.9, Flood=0.8, Soil Moisture=0.8, ET=0.7, LST=0.6).

---

## 2. Detailed Metrics and Indices (Per Factor)

All indices are **normalized 0–1**: 1 = highly favorable (no movement needed), 0 = unfavorable (movement likely).

### 2.1 Rainfall (CHIRPS; mm/day or seasonal mm)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <5 mm/day or <200 mm/season | 0.2 | Drought; drives to water. |
| Moderate: 5–20 mm/day or 200–500 mm/season | 0.8 | Balanced; minimal movement. |
| High: >20 mm/day or >500 mm/season | 0.3 | Flood risk; drives to high ground. |

- **Influence:** Low → 80% toward nearest water (<20 km). High → 70% toward elevation >50 m.
- **Likelihood:** 75–90% for extremes; 50% for moderate.

### 2.2 Vegetation Health / NDVI (MODIS/Sentinel-2; 0–1 scale)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <0.2 | 0.1 | Poor forage (<0.5 t/ha); long migrations. |
| Moderate: 0.2–0.5 | 0.6 | Adequate (0.5–1 t/ha); short movements. |
| High: >0.5 | 1.0 | Good (>1 t/ha); herds stay. |

- **Influence:** Low → 90% toward higher NDVI (>0.4 within 50–100 km). Prioritize in dry season.
- **Likelihood:** 85–95% for low; 30% for high.

### 2.3 Soil Moisture Index (SMAP/Sentinel-1; % or m³/m³; critical 0.12–0.26)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <20% or <0.12 m³/m³ | 0.2 | Dry; stresses vegetation, water-seeking. |
| Moderate: 20–40% or 0.12–0.26 m³/m³ | 0.7 | Optimal for forage. |
| High: >40% or >0.26 m³/m³ | 0.4 | Saturated; mud/flood risks. |

- **Influence:** Low → 75% to moister (>30%) or water. High → 60% to drier, elevated areas.
- **Likelihood:** 70–85% for low; 40% for moderate.

### 2.4 Water Bodies / Surface Water Extent (MODIS/Sentinel-2; % or km² within 10 km)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <10% or <1 km² | 0.1 | Scarce; forces migration. |
| Moderate: 10–30% or 1–5 km² | 0.8 | Sufficient; anchors herds. |
| High: >30% or >5 km² | 0.9 | Abundant; attracts but disease/flood risk. |

- **Influence:** Low → 85% to nearest fresh water (<20 km ideal). Avoid saline >5%.
- **Likelihood:** 80–95% for low; 20% if high and forage poor.

### 2.5 Evapotranspiration (MODIS/WaPOR; mm/day)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <2 mm/day | 0.9 | Low water loss; favorable. |
| Moderate: 2–5 mm/day | 0.6 | Balanced. |
| High: >5 mm/day | 0.3 | High stress; amplifies drought. |

- **Influence:** High → 65% to cooler (lower LST) or water.
- **Likelihood:** 60–75% for high; 30% for low.

### 2.6 Land Surface Temperature (MODIS; °C; stress >30°C)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <25°C | 1.0 | Comfortable. |
| Moderate: 25–30°C | 0.7 | Mild stress. |
| High: >30°C | 0.4 | Severe; reduces intake, shade-seeking. |

- **Influence:** High → 55% to cooler elevations (>100 m) or shaded vegetation.
- **Likelihood:** 50–70% for high; 20% for low.

### 2.7 Flood Extent / Inundation (MODIS/Sentinel-1; % flooded; threshold >10% avoid)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <5% | 1.0 | Safe. |
| Moderate: 5–10% | 0.5 | Partial risk. |
| High: >10% | 0.1 | Avoid; evacuation trigger. |

- **Influence:** High → 80% to non-flooded high ground (>50 m).
- **Likelihood:** 75–90% for high; 10% for low.

### 2.8 Geospatial Layers (distance km, elevation m, incidents/month)

| Sub-factor | Ranges and Index |
|------------|-------------------|
| **Proximity to fresh water** | <5 km → 1.0, 5–20 km → 0.6, >20 km → 0.2 |
| **Elevation (flood avoidance)** | >50 m above local mean → 0.8; <50 m → 0.4 |
| **Conflict zones** | 0 incidents/month → 1.0, 1–5 → 0.5, >5 → 0.1 |

- **Influence:** Water 80% attraction (<10 km). Elevation 70% push in wet season (>50 m). Conflicts 95% avoidance.
- **Likelihood:** 85–95% for conflicts (>5: 95% reroute); 60–80% for water/elevation extremes.

---

## 3. Composite Suitability Index (CSI) and Movement Rules

### CSI Formula

```
CSI = Σ (Index_i × Weight_i)
Weight_i = Rank_i / 10
CSI range: 0–1
```

### Movement Likelihood by CSI

| CSI Band | Movement likelihood | Behavior |
|----------|---------------------|----------|
| **High: >0.7** | 20–40% | Stay put. |
| **Moderate: 0.4–0.7** | 50–70% | Short moves <20 km. |
| **Low: <0.4** | 80–95% | Long moves 50–400 km to better CSI. |

### Path Prediction

- **Cost surface:** `cost = 1 / CSI + penalties` (penalties for conflict zones and flood >10%).
- **Method:** Least-cost path over 2–7 days from current herd locations.
- **Uncertainty:** Penalize indices 10–20% if data >5 days old; multi-factor alignment → confidence (e.g. 6+ factors align → >80% certainty).

### Likelihood Percentage (Bayesian-style)

- Base probability from season (e.g. 60% wet-season flood moves).
- Adjust by CSI: e.g. −20% if CSI >0.7, +30% if CSI <0.4.
- Output example: *"80% likelihood of moving 50 km north to high ground due to high rainfall and flood factors."*

---

## 4. Data Sources and Access Methods (Reference Only — No APIs Used)

The simulator uses **mock data only**; no live API calls. Below are the canonical sources and URLs for each factor, for documentation and future integration.

| # | Factor | Source | URL / Access | Notes |
|---|--------|--------|--------------|--------|
| 1 | Rainfall | CHIRPS | https://www.chc.ucsb.edu/data/chirps ; FTP https://data.chc.ucsb.edu/products/CHIRPS-2.0/ ; GEE `UCSB-CHG/CHIRPS/DAILY` ; ClimateSERV https://climateserv.servirglobal.net/ | Free, no key. 0.05°, 1981–present. |
| 2 | NDVI | MODIS / Sentinel-2 | MODIS modis.gsfc.nasa.gov ; LP DAAC; Earthdata; Sentinel-2 dataspace.copernicus.eu ; GEE `MODIS/061/MOD13A1` | Earthdata login; Copernicus free registration. |
| 3 | Soil Moisture | SMAP / Sentinel-1 | SMAP smap.jpl.nasa.gov ; NSIDC; Sentinel-1 Copernicus; GEE `NASA/SMAP/SPL3SMP/009` | Earthdata login. |
| 4 | Water extent | MODIS / Sentinel-2 | MOD44W; GEE `MODIS/006/MOD44W` | — |
| 5 | Evapotranspiration | MODIS / WaPOR | MOD16; WaPOR wapor.apps.fao.org ; FAO API; GEE MOD16/WaPOR | WaPOR Africa, free. |
| 6 | Land Surface Temperature | MODIS | MOD11; Earthdata; GEE `MODIS/061/MOD11A1` | Daily, 1 km. |
| 7 | Flood extent | MODIS / Sentinel-1 | NASA LANCE; GEE flood collections | Earthdata login. |
| 8 | Geospatial | HydroSHEDS, OSM Overpass, SRTM, Copernicus DEM, ACLED, HDX | hydrosheds.org ; overpass-turbo.eu ; Earthdata SRTM; Copernicus DEM; acleddata.com ; data.humdata.org/api | Overpass no key; ACLED/HDX free, some registration. |
| 9 | High-res (optional) | PlanetScope | planet.com ; developers.planet.com ; Planet Data API | Commercial; API key. |

### Integration Notes

- **Simulator (current):** Mock data only; no API keys or network calls.
- **Real app (future):** Google Earth Engine or Earthdata/Copernicus; handle latency and auth.

---

*Document version: 1.0 — HerdWatch cattle movement model specification. Implemented in `lib/csi.ts` and `lib/movement.ts`.*
