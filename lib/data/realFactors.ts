/**
 * Real Factor Values for CSI Model
 * =================================
 * Drop-in replacement for lib/mockFactors.ts.
 *
 * When real satellite data is loaded (via setEnvironmentGrid), it
 * uses pre-fetched values from GEE and ACLED. When data isn't
 * available, it gracefully falls back to the mock generator.
 *
 * The scenario parameters (rainfallAnomaly, droughtSeverity,
 * floodExtent, seasonalShift) are still applied as modifiers
 * on top of real data, enabling "what if" scenario simulation
 * even when using real satellite base values.
 *
 * Usage:
 *   import { setEnvironmentGrid, setConflictGrid, getFactorValuesAt } from "./data/realFactors";
 *   // On page load, fetch from API and load:
 *   setEnvironmentGrid(gridFromApi);
 *   setConflictGrid(conflictsFromApi);
 *   // Then call getFactorValuesAt() exactly like mockFactors.ts
 */

import type { FactorValues } from "../csi";
import type { DayScenario } from "../environment";
import type { EnvironmentGrid, ConflictGrid } from "./types";
import { getFactorValuesAt as getMockFactorValues } from "../mockFactors";

// ── Module-level state (loaded from API responses) ────────

let environmentGrid: EnvironmentGrid | null = null;
let conflictGrid: ConflictGrid | null = null;
let gridLookup: Map<string, FactorValues> | null = null;
let conflictLookup: Map<string, number> | null = null;

/** Grid resolution for key snapping (1 / step in degrees) */
const GRID_SNAP = 10; // snap to nearest 0.1°

function gridKey(lat: number, lng: number): string {
  return `${Math.round(lat * GRID_SNAP) / GRID_SNAP},${Math.round(lng * GRID_SNAP) / GRID_SNAP}`;
}

// ── Public API: load data ─────────────────────────────────

/** Load environment grid data (called after /api/environment fetch) */
export function setEnvironmentGrid(grid: EnvironmentGrid): void {
  environmentGrid = grid;
  gridLookup = new Map();
  for (const cell of grid.cells) {
    gridLookup.set(gridKey(cell.lat, cell.lng), cell.values);
  }
  console.log(
    `[RealFactors] Environment grid loaded: ${grid.cells.length} cells`
  );
}

/** Load conflict grid data (called after /api/conflicts fetch) */
export function setConflictGrid(grid: ConflictGrid): void {
  conflictGrid = grid;
  conflictLookup = new Map();
  for (const cell of grid.cellAggregates) {
    conflictLookup.set(gridKey(cell.lat, cell.lng), cell.incidentsPerMonth);
  }
  console.log(
    `[RealFactors] Conflict grid loaded: ${grid.cellAggregates.length} cells, ${grid.events.length} events`
  );
}

/** Check if real satellite data has been loaded */
export function isRealDataLoaded(): boolean {
  return gridLookup !== null;
}

/** Get the current data source mode */
export function getDataMode(): "real" | "mock" | "mixed" {
  if (gridLookup && conflictLookup) return "real";
  if (gridLookup || conflictLookup) return "mixed";
  return "mock";
}

/** Get the environment grid metadata (for UI display) */
export function getGridMetadata() {
  return environmentGrid?.metadata ?? null;
}

// ── Grid lookup ───────────────────────────────────────────

/**
 * Find the nearest grid cell to a given lat/lng.
 * First tries exact match, then searches 8 neighbors.
 */
function findNearest(lat: number, lng: number): FactorValues | null {
  if (!gridLookup) return null;

  // Exact match
  const exact = gridLookup.get(gridKey(lat, lng));
  if (exact) return exact;

  // Search neighbors (1 grid step in each direction)
  const step = 1 / GRID_SNAP;
  for (let dlat = -step; dlat <= step; dlat += step) {
    for (let dlng = -step; dlng <= step; dlng += step) {
      if (dlat === 0 && dlng === 0) continue;
      const neighbor = gridLookup.get(gridKey(lat + dlat, lng + dlng));
      if (neighbor) return neighbor;
    }
  }

  return null;
}

/** Get conflict incidents/month at a location */
function getConflictIncidents(lat: number, lng: number): number | null {
  if (!conflictLookup) return null;

  const exact = conflictLookup.get(gridKey(lat, lng));
  if (exact !== undefined) return exact;

  // Check neighbors
  const step = 1 / GRID_SNAP;
  for (let dlat = -step; dlat <= step; dlat += step) {
    for (let dlng = -step; dlng <= step; dlng += step) {
      if (dlat === 0 && dlng === 0) continue;
      const v = conflictLookup.get(gridKey(lat + dlat, lng + dlng));
      if (v !== undefined) return v;
    }
  }

  return 0; // No conflict data = 0 incidents
}

// ── Main export ───────────────────────────────────────────

/**
 * Get factor values at (lat, lng) for a given scenario.
 *
 * When real satellite data is loaded:
 *   - Uses GEE-derived base values
 *   - Applies scenario modifiers (rainfall anomaly, drought, flood, season)
 *   - Merges ACLED conflict data
 *
 * When real data is NOT loaded:
 *   - Falls back to mock generator (lib/mockFactors.ts)
 *   - System works identically to before
 */
export function getFactorValuesAt(
  lat: number,
  lng: number,
  scenario: DayScenario
): FactorValues {
  const realValues = findNearest(lat, lng);

  if (!realValues) {
    // No real data available at this location — fall back to mock
    return getMockFactorValues(lat, lng, scenario);
  }

  // ── Scenario modifiers on top of real satellite base values ──
  // Allows "what-if" simulation (drought, flood, seasonal shift, rain)
  // even when using real data as the baseline.

  const rainfallMod = 1 + scenario.rainfallAnomaly * 0.4;
  const droughtMod = Math.max(0.3, 1 - scenario.droughtSeverity * 0.7);
  const floodAdd = scenario.floodExtent * 28;

  // ── Seasonal shift: simulate wet/dry phase offset ──
  // Real data is a point-in-time snapshot; the slider modulates factors
  // as if the season were shifted forward/backward by N weeks.
  // South Sudan wet season ~Apr–Oct (days 90–300). Compute phase shift.
  const baseDoy = (((scenario.day ?? 180) + scenario.seasonalShift * 7) % 365 + 365) % 365;
  const wetPhase = Math.max(0, Math.sin(((baseDoy - 120) / 365) * Math.PI * 2));
  // seasonalFactor: 1.0 at peak wet, 0.0 at peak dry → used to scale moisture/veg
  const seasonalFactor = 0.7 + wetPhase * 0.3; // range 0.7–1.0

  // ── Derived rainfall (with seasonal + anomaly + drought) ──
  const adjustedRainfall = clamp(
    realValues.rainfallMmDay * rainfallMod * droughtMod * seasonalFactor,
    0,
    50
  );

  // ── NDVI: affected by drought + seasonal drying ──
  const adjustedNdvi = clamp(
    realValues.ndvi * droughtMod * seasonalFactor,
    0.05,
    0.95
  );

  // ── Soil moisture: drought + rainfall boost + seasonal ──
  const rainSoilBoost = (adjustedRainfall / 20) * 8; // wetter rain → more soil moisture
  const adjustedSoilMoisture = clamp(
    realValues.soilMoisturePct * droughtMod * seasonalFactor + rainSoilBoost,
    0,
    100
  );

  // ── Water extent: seasonal expansion + flood + rainfall ──
  const rainWaterBoost = scenario.rainfallAnomaly > 0 ? scenario.rainfallAnomaly * 5 : 0;
  const adjustedWaterExtent = clamp(
    realValues.waterExtentPct * seasonalFactor + floodAdd + rainWaterBoost,
    0,
    100
  );

  // ── ET: increases with drought/heat ──
  const adjustedET = clamp(
    realValues.evapotranspirationMmDay + scenario.droughtSeverity * 1.2,
    0.5,
    10
  );

  // ── LST: increases with drought ──
  const adjustedLST = clamp(
    realValues.landSurfaceTempC + scenario.droughtSeverity * 2.5,
    15,
    50
  );

  // ── Flood: base + scenario slider + heavy-rain effect ──
  const rainFloodBoost = adjustedRainfall > 20 ? (adjustedRainfall - 20) * 2 : 0;
  const adjustedFlood = clamp(
    realValues.floodExtentPct + floodAdd + rainFloodBoost,
    0,
    100
  );

  // ── Conflict (ACLED if available, otherwise from env grid) ──
  const conflicts = getConflictIncidents(lat, lng);

  return {
    rainfallMmDay: adjustedRainfall,
    ndvi: adjustedNdvi,
    soilMoisturePct: adjustedSoilMoisture,
    waterExtentPct: adjustedWaterExtent,
    evapotranspirationMmDay: adjustedET,
    landSurfaceTempC: adjustedLST,
    floodExtentPct: adjustedFlood,
    distToWaterKm: realValues.distToWaterKm,
    elevationAboveLocalM: realValues.elevationAboveLocalM,
    conflictIncidentsPerMonth:
      conflicts ?? realValues.conflictIncidentsPerMonth,
  };
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
