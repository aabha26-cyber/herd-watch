# Consolidated Metrics, Indices, and Frameworks for Cattle Movement Prediction Model

This document is the **single source of truth** for the HerdWatch cattle movement model. It defines factor rankings (1–10), numerical ranges, normalized indices (0–1), influence on movement, likelihood percentages, the Composite Suitability Index (CSI) formula, and path prediction. **The simulator uses mock data conforming to these ranges; real CHIRPS/MODIS/Sentinel/ACLED data can be plugged in via the same interfaces.** Cattle herd locations will be supplied separately.

---

## 1. Factor Influence Rankings (Scale: 1–10, 10 = Most Influential)

| Rank | Factor | Rationale |
|------|--------|-----------|
| **10** | Vegetation Health / Forage Availability / NDVI | Primary driver; correlates with biomass and herd mobility. |
| **9** | Geospatial Layers (water proximity, elevation, conflict zones) | Sub-factors: water=9, elevation=8, conflicts=10; conflicts override environmental factors. |
| **9** | Rainfall | Drives flooding/drought migrations. |
| **9** | Water Bodies / Surface Water Extent | Essential for drinking; key in dry seasons. |
| **8** | Flood Extent / Inundation Mapping | Triggers avoidance of lowlands. |
| **8** | Soil Moisture Index | Affects vegetation and water retention. |
| **7** | Evapotranspiration | Increases water stress indirectly. |
| **6** | Land Surface Temperature | Causes stress but secondary to water/forage. |

**Weights for CSI:** `Weight_i = Rank_i / 10` (e.g. NDVI=1.0, Geospatial=0.9, Rainfall=0.9, Water=0.9, Flood=0.8, Soil Moisture=0.8, ET=0.7, LST=0.6).

---

## 2. Detailed Metrics and Indices (Per Factor)

For each factor: numerical ranges (low/moderate/high), **normalized index (0–1)**, influence on movement direction, and **likelihood percentages**. Input raster/pixel data from satellites (CHIRPS, MODIS, Sentinel, SMAP, WaPOR, ACLED, HydroSHEDS, SRTM/Copernicus DEM); compute per-area scores and predict paths.

### 2.1 Rainfall (Source: CHIRPS; Units: mm/day or seasonal cumulative mm)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <5 mm/day or <200 mm/season | 0.2 | Drought; drives to water. |
| Moderate: 5–20 mm/day or 200–500 mm/season | 0.8 | Balanced; minimal movement. |
| High: >20 mm/day or >500 mm/season | 0.3 | Flood risk; drives to high ground. |

- **Influence:** Low → 80% toward nearest water (<20 km from HydroSHEDS). High → 70% toward elevations >50 m (Copernicus DEM).
- **Likelihood:** 75–90% for extremes (e.g. <5 mm/day: 85% southward in dry season); 50% for moderate.

### 2.2 Vegetation Health / NDVI (Source: MODIS/Sentinel-2; 0–1 scale; Biomass proxy: t/ha, <0.5 t/ha poor)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <0.2 | 0.1 | Poor forage (<0.5 t/ha); long migrations. |
| Moderate: 0.2–0.5 | 0.6 | Adequate (0.5–1 t/ha); short movements. |
| High: >0.5 | 1.0 | Good (>1 t/ha); herds stay. |

- **Influence:** Low → 90% toward higher NDVI (>0.4 within 50–100 km). Prioritize in dry season.
- **Likelihood:** 85–95% for low (e.g. <0.2: 90% migration); 30% for high.

### 2.3 Soil Moisture Index (Source: SMAP/Sentinel-1; % or m³/m³; Critical: 0.12–0.26)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <20% or <0.12 m³/m³ | 0.2 | Dry; stresses vegetation. |
| Moderate: 20–40% or 0.12–0.26 m³/m³ | 0.7 | Optimal. |
| High: >40% or >0.26 m³/m³ | 0.4 | Saturated; mud/flood risks. |

- **Influence:** Low → 75% to moister areas (>30%) or water. High → 60% to drier elevations.
- **Likelihood:** 70–85% for low (e.g. <20%: 80% for 20–50 km moves); 40% for moderate.

### 2.4 Water Bodies / Surface Water Extent (Source: MODIS/Sentinel-2; % or km² within 10 km)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <10% or <1 km² | 0.1 | Scarce; forces migration. |
| Moderate: 10–30% or 1–5 km² | 0.8 | Sufficient. |
| High: >30% or >5 km² | 0.9 | Abundant; attracts but disease risk. |

- **Influence:** Low → 85% to nearest fresh water (<10 km ideal). Avoid saline >5%.
- **Likelihood:** 80–95% for low (e.g. <10%: 90% directed migration); 20% if high and forage poor.

### 2.5 Evapotranspiration (Source: MODIS/WaPOR; mm/day)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <2 mm/day | 0.9 | Low water loss; favorable. |
| Moderate: 2–5 mm/day | 0.6 | Balanced. |
| High: >5 mm/day | 0.3 | High stress; amplifies drought. |

- **Influence:** High → 65% to cooler (lower LST) or water.
- **Likelihood:** 60–75% for high (e.g. >5 mm/day: 70% amplifying moves); 30% for low.

### 2.6 Land Surface Temperature (Source: MODIS; °C; Stress threshold: >30°C)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <25°C | 1.0 | Comfortable. |
| Moderate: 25–30°C | 0.7 | Mild stress. |
| High: >30°C | 0.4 | Severe; reduces intake. |

- **Influence:** High → 55% to cooler elevations (>100 m) or shaded vegetation.
- **Likelihood:** 50–70% for high (e.g. >30°C: 65% short moves); 20% for low.

### 2.7 Flood Extent / Inundation (Source: MODIS/Sentinel-1; % flooded; Threshold: >10% avoid)

| Range | Index | Interpretation |
|-------|-------|----------------|
| Low: <5% | 1.0 | Safe. |
| Moderate: 5–10% | 0.5 | Partial risk. |
| High: >10% | 0.1 | Avoid; evacuation trigger. |

- **Influence:** High → 80% to non-flooded high ground (>50 m).
- **Likelihood:** 75–90% for high (e.g. >10%: 85% immediate relocation); 10% for low.

### 2.8 Geospatial Layers (Sources: HydroSHEDS/OSM water; SRTM/Copernicus DEM elevation; ACLED/UN OCHA conflicts)

| Sub-factor | Ranges and Index |
|------------|-------------------|
| **Proximity to fresh water** | <5 km → 1.0, 5–20 km → 0.6, >20 km → 0.2 |
| **Elevation (flood avoidance)** | >50 m above local mean → 0.8; <50 m → 0.4 |
| **Conflict zones** | 0 incidents/month → 1.0, 1–5 → 0.5, >5 → 0.1 |

- **Influence:** Water 80% attraction (<10 km). Elevation 70% push in wet season (>50 m). Conflicts 95% reroute/avoid (>5 incidents).
- **Likelihood:** 85–95% for conflicts (e.g. >5: 95% reroute); 60–80% for water/elevation extremes.

---

## 3. Framework for Combining Factors and Predicting Movement

### Composite Suitability Index (CSI)

- **Formula:** `CSI = Σ (Index_i × Weight_i)`, where `Weight_i = Rank_i / 10`. CSI range: 0–1.
- **High CSI (>0.7):** Low movement likelihood (20–40%); stay put.
- **Moderate CSI (0.4–0.7):** Medium likelihood (50–70%); short moves <20 km.
- **Low CSI (<0.4):** High likelihood (80–95%); long moves 50–400 km to better CSI areas.

### Path Prediction

- **Method:** Least-cost path on geospatial overlays: `cost = 1/CSI + penalties` for conflicts and flood >10%. Extrapolate from current herd locations over 2–7 days; weight recent data higher; simulate weather changes.
- **Uncertainty:** Penalize indices 10–20% if data >5 days old; multi-factor alignment → confidence (e.g. 6+ factors align → >80% certainty).

### Likelihood Percentage (Bayesian-style)

- Base probability from season (e.g. 60% wet-season flood moves). Adjust by CSI (e.g. −20% if CSI >0.7, +30% if CSI <0.4).
- **Output example:** *"80% likelihood of moving 50 km north to high ground due to high rainfall and flood factors."*

---

## 4. Data Sources (Reference — for real-data integration)

| Factor | Source | Notes |
|--------|--------|------|
| Rainfall | CHIRPS | 0.05°, 1981–present; GEE `UCSB-CHG/CHIRPS/DAILY` |
| NDVI | MODIS / Sentinel-2 | MOD13A1 16-day 1 km; Sentinel-2 10 m 5-day |
| Soil Moisture | SMAP / Sentinel-1 | SMAP 3-day 36/9 km; GEE `NASA/SMAP/SPL3SMP/009` |
| Water extent | MODIS / Sentinel-2 | MOD44W; JRC Global Surface Water |
| Evapotranspiration | MODIS / WaPOR | MOD16A2; WaPOR Africa 10-day 100 m |
| Land Surface Temperature | MODIS | MOD11A1 daily 1 km |
| Flood extent | MODIS / Sentinel-1 | NASA LANCE NRT; GEE flood collections |
| Geospatial | HydroSHEDS, SRTM/Copernicus DEM, ACLED, HDX | Water, elevation, conflict incidents |

---

*Document version: 2.0 — Consolidated framework. Implemented in `lib/csi.ts`, `lib/mockFactors.ts`, and `lib/movement.ts`. Weather values are South Sudan–realistic (Jonglei–Bor–Sudd corridor); cattle DB to be supplied.*
