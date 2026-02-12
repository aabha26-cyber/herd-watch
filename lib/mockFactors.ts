/**
 * Mock Factor Values for CSI Model
 * =================================
 * Provides synthetic values for all 8 factors at any (lat, lng) for the
 * Composite Suitability Index. Aligned with docs/METRICS_AND_SOURCES.md.
 * In production, replace with real CHIRPS/MODIS/Sentinel/ACLED data.
 */

import {
  waterAt,
  vegetationAt,
  conflictHistoryAt,
  distanceKm,
  WATER_BODIES,
  type DayScenario,
} from "./environment";
import type { FactorValues } from "./csi";

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/** Local mean elevation proxy: use a coarse grid so "above local mean" is meaningful. South Sudan is largely 400–500 m; we use 450 m as baseline and add noise. */
function mockElevationAboveLocalM(lat: number, lng: number): number {
  const cellLat = Math.floor(lat * 2) / 2;
  const cellLng = Math.floor(lng * 2) / 2;
  const base = (seededRandom(cellLat * 100 + cellLng) - 0.5) * 120;
  return base;
}

/** Conflict incidents per month (mock): 0–8 based on conflictHistory 0–1. */
function mockConflictIncidentsPerMonth(lat: number, lng: number): number {
  const h = conflictHistoryAt(lat, lng);
  if (h < 0.2) return 0;
  if (h < 0.5) return Math.round(1 + h * 4);
  return Math.round(5 + h * 3);
}

/**
 * Return mock factor values at (lat, lng) for the given scenario.
 * Uses existing environment helpers where possible; fills rest with seeded mock data.
 */
export function getFactorValuesAt(
  lat: number,
  lng: number,
  scenario: DayScenario
): FactorValues {
  const veg = vegetationAt(lat, lng, scenario);
  const water = waterAt(lat, lng, scenario);

  // Rainfall mm/day: seasonal + anomaly; range ~0–25
  const dayOfYear = ((scenario.day + scenario.seasonalShift) % 365 + 365) % 365;
  const seasonalRain = 3 + 12 * Math.max(0, Math.sin(((dayOfYear - 90) / 365) * Math.PI * 2));
  const anomaly = (scenario.rainfallAnomaly + 1) * 0.5 * 8;
  const rainfallMmDay = Math.max(0, seasonalRain + anomaly + (seededRandom(lat * 50 + lng * 30 + scenario.day) - 0.5) * 4);

  // NDVI: use vegetation from environment (already 0–1)
  const ndvi = veg;

  // Soil moisture %: correlate with water proximity and rainfall
  const soilMoisturePct = Math.min(
    100,
    Math.max(0, water.score * 35 + (rainfallMmDay / 20) * 25 + seededRandom(lat * 77 + lng * 41) * 15)
  );

  // Water extent % within 10 km: proxy from distance to water
  const waterExtentPct = water.distKm < 5 ? 35 : water.distKm < 15 ? 15 : water.distKm < 25 ? 8 : 3;

  // Evapotranspiration mm/day: higher when hot and dry; range ~1–6
  const evapotranspirationMmDay = 2 + (1 - water.score) * 2 + seededRandom(lat * 11 + lng * 7 + scenario.day) * 1.5;

  // Land surface temp °C: seasonal + drought; range ~22–34
  const baseTemp = 26 + Math.sin((dayOfYear / 365) * Math.PI * 2) * 4;
  const droughtBoost = scenario.droughtSeverity * 3;
  const landSurfaceTempC = Math.min(38, Math.max(20, baseTemp + droughtBoost + (seededRandom(lat * 31 + lng) - 0.5) * 2));

  // Flood extent %: scenario + seasonal
  const floodExtentPct = Math.min(
    100,
    scenario.floodExtent * 25 + (dayOfYear > 120 && dayOfYear < 300 ? 5 : 0) + seededRandom(lat * 19 + lng * 23) * 5
  );

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
