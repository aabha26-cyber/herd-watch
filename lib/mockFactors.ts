/**
 * Mock Factor Values for CSI Model — South Sudan Realistic
 * =========================================================
 * All 8 factors use climatology and ranges aligned with the Jonglei–Bor–Sudd
 * corridor and docs/METRICS_AND_SOURCES.md. Values conform to CHIRPS, MODIS,
 * SMAP, WaPOR, Sentinel-style ranges so indices (low/moderate/high) map correctly.
 * In production, replace with real API/rasters; same interfaces.
 */

import {
  waterAt,
  vegetationAt,
  conflictHistoryAt,
  type DayScenario,
} from "./environment";
import type { FactorValues } from "./csi";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/** Day of year 0–365 from scenario (accounts for seasonalShift in days). */
function dayOfYear(scenario: DayScenario): number {
  return ((scenario.day + scenario.seasonalShift) % 365 + 365) % 365;
}

/**
 * South Sudan wet season: ~Apr–Oct (day 90–300), peak Jun–Sep (day 150–270).
 * Returns 0 (dry) to 1 (peak wet).
 */
function wetSeasonPhase(doy: number): number {
  const t = (doy - 120) / 365;
  const phase = Math.sin(t * Math.PI * 2);
  return Math.max(0, phase);
}

/** Local mean elevation proxy (m). Jonglei corridor ~400–500 m; local variation ±80 m. */
function mockElevationAboveLocalM(lat: number, lng: number): number {
  const cellLat = Math.floor(lat * 2) / 2;
  const cellLng = Math.floor(lng * 2) / 2;
  return (seededRandom(cellLat * 100 + cellLng) - 0.5) * 160;
}

/** Conflict incidents per month (ACLED proxy). 0, 1–5, or >5 per spec. */
function mockConflictIncidentsPerMonth(lat: number, lng: number): number {
  const h = conflictHistoryAt(lat, lng);
  if (h < 0.2) return 0;
  if (h < 0.5) return Math.min(5, Math.round(1 + h * 6));
  return Math.min(10, Math.round(5 + h * 4));
}

/**
 * Return factor values at (lat, lng) for the given scenario.
 * All ranges match METRICS_AND_SOURCES.md so index functions (low/moderate/high) apply correctly.
 */
export function getFactorValuesAt(
  lat: number,
  lng: number,
  scenario: DayScenario
): FactorValues {
  const doy = dayOfYear(scenario);
  const wet = wetSeasonPhase(doy);
  const water = waterAt(lat, lng, scenario);
  const veg = vegetationAt(lat, lng, scenario);

  // ── 1. Rainfall (CHIRPS-like; mm/day). South Sudan: dry 0.5–4, wet 5–25, peak to 28.
  const baseRainDry = 1.5 + seededRandom(lat * 50 + lng * 30 + scenario.day) * 2.5;
  const baseRainWet = 8 + wet * 12 + seededRandom(lat * 37 + lng * 41 + scenario.day) * 6;
  let rainfallMmDay = (1 - wet) * baseRainDry + wet * baseRainWet;
  rainfallMmDay *= 1 + scenario.rainfallAnomaly * 0.4;  // anomaly -1 to +1
  rainfallMmDay *= Math.max(0.3, 1 - scenario.droughtSeverity * 0.7);
  rainfallMmDay = Math.max(0, Math.min(28, rainfallMmDay));

  // ── 2. NDVI (MODIS/Sentinel-2; 0–1). Dry 0.15–0.45, wet 0.35–0.65; use vegetation + clamp.
  const ndvi = Math.max(0.12, Math.min(0.72, veg));

  // ── 3. Soil moisture (SMAP; %). Critical 12–26%. Dry 12–22%, wet 22–42%.
  const soilDry = 14 + seededRandom(lat * 77 + lng * 41) * 8;
  const soilWet = 24 + wet * 14 + seededRandom(lat * 19 + lng * 53) * 6;
  let soilMoisturePct = (1 - wet) * soilDry + wet * soilWet;
  soilMoisturePct += (water.distKm < 15 ? 5 : 0) + (rainfallMmDay / 20) * 8;
  soilMoisturePct = Math.max(0, Math.min(100, soilMoisturePct));

  // ── 4. Water extent (% within 10 km). Low <10, Moderate 10–30, High >30. Seasonal expansion near Sudd.
  const nearWater = water.distKm < 8;
  const seasonalWater = wet * 12;
  let waterExtentPct = water.distKm < 5 ? 18 + seasonalWater + seededRandom(lat * 11 + lng * 7) * 12
    : water.distKm < 15 ? 8 + seasonalWater * 0.5 + seededRandom(lat * 13 + lng * 17) * 8
    : water.distKm < 25 ? 3 + seededRandom(lat * 23 + lng * 19) * 6
    : seededRandom(lat * 31 + lng * 29) * 5;
  waterExtentPct = Math.max(0, Math.min(100, waterExtentPct));

  // ── 5. Evapotranspiration (WaPOR; mm/day). High when hot/dry: 3.5–6; wet: 1.5–4.
  const etDry = 4 + seededRandom(lat * 11 + lng * 7 + scenario.day) * 1.5;
  const etWet = 2 + wet * 1.2 + seededRandom(lat * 17 + lng * 13) * 0.8;
  let evapotranspirationMmDay = (1 - wet) * etDry + wet * etWet;
  evapotranspirationMmDay += scenario.droughtSeverity * 1.2;
  evapotranspirationMmDay = Math.max(1, Math.min(7, evapotranspirationMmDay));

  // ── 6. Land surface temperature (MODIS; °C). South Sudan 24–34°C. Cooler in wet, hotter in dry.
  const lstBase = 28 + (1 - wet) * 3 + (wet * -2);
  const lstNoise = (seededRandom(lat * 31 + lng * 23 + scenario.day) - 0.5) * 2;
  let landSurfaceTempC = lstBase + lstNoise + scenario.droughtSeverity * 2.5;
  landSurfaceTempC = Math.max(22, Math.min(38, landSurfaceTempC));

  // ── 7. Flood extent (%). Sudd/Jonglei: dry <5%, wet 5–25% spatially; scenario adds 0–30%.
  const floodSeasonal = wet * (nearWater ? 18 : 6) + seededRandom(lat * 19 + lng * 23) * 4;
  let floodExtentPct = Math.max(0, floodSeasonal + scenario.floodExtent * 28);
  floodExtentPct = Math.min(100, floodExtentPct);

  // ── 8. Geospatial (from environment + mocks)
  const distToWaterKm = water.distKm;
  const elevationAboveLocalM = mockElevationAboveLocalM(lat, lng);
  const conflictIncidentsPerMonth = mockConflictIncidentsPerMonth(lat, lng);

  return {
    rainfallMmDay,
    ndvi,
    soilMoisturePct,
    waterExtentPct,
    evapotranspirationMmDay,
    landSurfaceTempC,
    floodExtentPct,
    distToWaterKm,
    elevationAboveLocalM,
    conflictIncidentsPerMonth,
  };
}
