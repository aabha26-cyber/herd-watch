/**
 * Environment Layer Engine
 * ========================
 * Static + dynamic environmental layers for South Sudan.
 * Provides vegetation quality, water proximity, rainfall/weather,
 * and known conflict-prone areas.
 *
 * In production these come from real satellite datasets:
 *   - Vegetation: MODIS NDVI / Sentinel-2 derived NDVI
 *   - Water: JRC Global Surface Water / HydroSHEDS
 *   - Rainfall: CHIRPS 2.0
 *   - Conflict zones: ACLED event data
 *
 * For the simulator we generate plausible synthetic layers
 * seeded from known geography.
 */

import { SOUTH_SUDAN_BOUNDS } from "./constants";

// ── Types ─────────────────────────────────────────────────

export type VegetationQuality = "low" | "medium" | "high";

export type EnvironmentCell = {
  lat: number;
  lng: number;
  /** 0-1 vegetation greenness (NDVI proxy) */
  vegetation: number;
  vegetationLabel: VegetationQuality;
  /** 0-1 water availability (1 = abundant) */
  water: number;
  /** km to nearest significant water body */
  distToWaterKm: number;
  /** 0-1 recent rainfall (1 = heavy rain) */
  rainfall: number;
  /** 0-1 conflict risk from historical events */
  conflictHistory: number;
  /** combined score for heatmap rendering */
  combined: number;
};

export type WaterBody = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: "river" | "lake" | "wetland" | "seasonal";
};

export type Village = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  population?: number;
};

export type ConflictZone = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radiusKm: number;
  severity: "low" | "medium" | "high";
};

// ── Static data: water bodies (from HDX South Sudan Rivers + known lakes) ──

export const WATER_BODIES: WaterBody[] = [
  // White Nile corridor
  { id: "w1", name: "White Nile (Juba)", lat: 4.85, lng: 31.60, type: "river" },
  { id: "w2", name: "White Nile (Bor)", lat: 6.21, lng: 31.56, type: "river" },
  { id: "w3", name: "White Nile (Malakal)", lat: 9.53, lng: 31.65, type: "river" },
  { id: "w4", name: "White Nile (Renk)", lat: 11.75, lng: 32.78, type: "river" },
  // Sudd wetland
  { id: "w5", name: "Sudd Wetland (Central)", lat: 7.50, lng: 30.50, type: "wetland" },
  { id: "w6", name: "Sudd Wetland (East)", lat: 7.80, lng: 31.20, type: "wetland" },
  { id: "w7", name: "Sudd Wetland (South)", lat: 6.90, lng: 30.80, type: "wetland" },
  // Bahr el Ghazal basin
  { id: "w8", name: "Bahr el Ghazal", lat: 8.50, lng: 28.50, type: "river" },
  { id: "w9", name: "Lol River", lat: 9.10, lng: 27.00, type: "river" },
  { id: "w10", name: "Jur River (Wau)", lat: 7.70, lng: 28.00, type: "river" },
  // Sobat / Eastern
  { id: "w11", name: "Sobat River", lat: 8.80, lng: 33.00, type: "river" },
  { id: "w12", name: "Pibor River", lat: 6.80, lng: 33.10, type: "river" },
  // Seasonal water points
  { id: "w13", name: "Tonj seasonal", lat: 7.27, lng: 28.68, type: "seasonal" },
  { id: "w14", name: "Akobo seasonal", lat: 7.78, lng: 33.00, type: "seasonal" },
  { id: "w15", name: "Lake No", lat: 9.50, lng: 30.50, type: "lake" },
];

// ── Static data: villages / settlements (from HDX OSM populated places) ──

export const VILLAGES: Village[] = [
  { id: "v1", name: "Juba", lat: 4.85, lng: 31.60, population: 525000 },
  { id: "v2", name: "Malakal", lat: 9.53, lng: 31.66, population: 160000 },
  { id: "v3", name: "Wau", lat: 7.70, lng: 27.99, population: 151000 },
  { id: "v4", name: "Bor", lat: 6.21, lng: 31.56, population: 80000 },
  { id: "v5", name: "Rumbek", lat: 6.81, lng: 29.68, population: 45000 },
  { id: "v6", name: "Yambio", lat: 4.57, lng: 28.40, population: 40000 },
  { id: "v7", name: "Torit", lat: 4.41, lng: 32.57, population: 28000 },
  { id: "v8", name: "Aweil", lat: 8.77, lng: 27.40, population: 25000 },
  { id: "v9", name: "Kapoeta", lat: 4.77, lng: 33.59, population: 20000 },
  { id: "v10", name: "Bentiu", lat: 9.23, lng: 29.83, population: 18000 },
  { id: "v11", name: "Pibor", lat: 6.80, lng: 33.13, population: 12000 },
  { id: "v12", name: "Tonj", lat: 7.27, lng: 28.68, population: 15000 },
  { id: "v13", name: "Gogrial", lat: 8.53, lng: 28.10, population: 10000 },
  { id: "v14", name: "Akobo", lat: 7.78, lng: 33.00, population: 8000 },
  { id: "v15", name: "Renk", lat: 11.75, lng: 32.78, population: 15000 },
  { id: "v16", name: "Yei", lat: 4.09, lng: 30.68, population: 35000 },
  { id: "v17", name: "Nimule", lat: 3.60, lng: 32.06, population: 20000 },
  { id: "v18", name: "Nasir", lat: 8.62, lng: 33.07, population: 12000 },
  { id: "v19", name: "Leer", lat: 8.30, lng: 30.10, population: 10000 },
  { id: "v20", name: "Turalei", lat: 8.57, lng: 27.92, population: 9000 },
];

// ── Static data: known conflict-prone areas (from ACLED patterns) ──

export const CONFLICT_ZONES: ConflictZone[] = [
  { id: "cz1", name: "Greater Pibor (cattle raiding)", lat: 6.80, lng: 33.10, radiusKm: 50, severity: "high" },
  { id: "cz2", name: "Jonglei-Bor corridor", lat: 6.50, lng: 31.70, radiusKm: 40, severity: "high" },
  { id: "cz3", name: "Upper Nile (Malakal)", lat: 9.60, lng: 31.70, radiusKm: 35, severity: "high" },
  { id: "cz4", name: "Unity State (Bentiu)", lat: 9.20, lng: 29.80, radiusKm: 30, severity: "medium" },
  { id: "cz5", name: "Abyei border zone", lat: 9.60, lng: 28.40, radiusKm: 45, severity: "high" },
  { id: "cz6", name: "Lakes State (Rumbek)", lat: 6.80, lng: 29.70, radiusKm: 25, severity: "medium" },
  { id: "cz7", name: "Warrap (Tonj-Gogrial)", lat: 8.00, lng: 28.30, radiusKm: 30, severity: "medium" },
  { id: "cz8", name: "Eastern Equatoria (Kapoeta)", lat: 4.80, lng: 33.50, radiusKm: 25, severity: "medium" },
];

// ── Utility ──────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/** Haversine-ish distance in km between two points (flat approx OK for South Sudan scale) */
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const dlat = (lat2 - lat1) * 111;
  const dlng = (lng2 - lng1) * 111 * Math.cos(((lat1 + lat2) / 2) * (Math.PI / 180));
  return Math.sqrt(dlat * dlat + dlng * dlng);
}

// ── Dynamic environment for a given day ─────────────────

export type DayScenario = {
  /** Day index from start of simulation (0 = today) */
  day: number;
  /** -1 to 1: drought to wet */
  rainfallAnomaly: number;
  /** 0 to 1 */
  droughtSeverity: number;
  /** 0 to 1 */
  floodExtent: number;
  /** seasonal offset in days */
  seasonalShift: number;
};

/**
 * Compute the vegetation score for a point on a given day.
 * Higher near water, modulated by rainfall and season.
 * Returns 0–1 where 1 = excellent grazing.
 */
export function vegetationAt(lat: number, lng: number, scenario: DayScenario): number {
  // Base: distance to nearest water body drives vegetation
  let minDistKm = Infinity;
  for (const wb of WATER_BODIES) {
    const d = distanceKm(lat, lng, wb.lat, wb.lng);
    if (d < minDistKm) minDistKm = d;
  }
  // Vegetation decays with distance from water (max ~200km relevant)
  const waterProx = Math.max(0, 1 - minDistKm / 200);

  // Seasonal modulation: wetter months (Jun-Oct) = more vegetation
  const dayOfYear = ((scenario.day + scenario.seasonalShift) % 365 + 365) % 365;
  const seasonal = 0.5 + 0.5 * Math.sin(((dayOfYear - 90) / 365) * Math.PI * 2);

  // Rainfall boost
  const rainBoost = (scenario.rainfallAnomaly + 1) / 2; // 0 to 1

  // Drought penalty
  const droughtPen = 1 - scenario.droughtSeverity * 0.5;

  // Spatial variation (seeded noise)
  const noise = seededRandom(Math.round(lat * 100) * 1000 + Math.round(lng * 100)) * 0.3;

  const veg = Math.max(0, Math.min(1, waterProx * 0.4 + seasonal * 0.25 + rainBoost * 0.2 + noise * 0.15)) * droughtPen;
  return Math.max(0, Math.min(1, veg));
}

/**
 * Water availability at a point — 0-1 and distance in km.
 */
export function waterAt(lat: number, lng: number, scenario: DayScenario): { score: number; distKm: number } {
  let minDistKm = Infinity;
  let nearestType: string = "river";
  for (const wb of WATER_BODIES) {
    const d = distanceKm(lat, lng, wb.lat, wb.lng);
    if (d < minDistKm) {
      minDistKm = d;
      nearestType = wb.type;
    }
  }

  // Seasonal water: some dry up
  let seasonalMult = 1;
  if (nearestType === "seasonal") {
    const dayOfYear = ((scenario.day + scenario.seasonalShift) % 365 + 365) % 365;
    seasonalMult = dayOfYear > 120 && dayOfYear < 300 ? 1 : 0.2;
  }

  // Flood increases water availability everywhere
  const floodBoost = scenario.floodExtent * 0.3;

  const score = Math.max(0, Math.min(1, (1 - minDistKm / 150) * seasonalMult + floodBoost));
  return { score, distKm: minDistKm };
}

/**
 * Conflict-history score at a point — higher near known conflict zones.
 */
export function conflictHistoryAt(lat: number, lng: number): number {
  let maxScore = 0;
  for (const cz of CONFLICT_ZONES) {
    const d = distanceKm(lat, lng, cz.lat, cz.lng);
    if (d < cz.radiusKm) {
      const severity = cz.severity === "high" ? 1 : cz.severity === "medium" ? 0.6 : 0.3;
      const proximity = 1 - d / cz.radiusKm;
      maxScore = Math.max(maxScore, proximity * severity);
    }
  }
  return maxScore;
}

/**
 * Distance to nearest village/settlement in km.
 */
export function nearestVillageDistance(lat: number, lng: number): { distKm: number; village: Village | null } {
  let minDist = Infinity;
  let nearest: Village | null = null;
  for (const v of VILLAGES) {
    const d = distanceKm(lat, lng, v.lat, v.lng);
    if (d < minDist) {
      minDist = d;
      nearest = v;
    }
  }
  return { distKm: minDist, village: nearest };
}

/**
 * Generate a full environment grid for heatmap rendering.
 * Resolution: ~0.25° (~25km cells) for performance.
 */
export function generateEnvironmentGrid(scenario: DayScenario, step = 0.25): EnvironmentCell[] {
  const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;
  const cells: EnvironmentCell[] = [];

  for (let lat = south; lat <= north; lat += step) {
    for (let lng = west; lng <= east; lng += step) {
      const veg = vegetationAt(lat, lng, scenario);
      const w = waterAt(lat, lng, scenario);
      const conf = conflictHistoryAt(lat, lng);

      const vegetationLabel: VegetationQuality =
        veg < 0.33 ? "low" : veg < 0.66 ? "medium" : "high";

      // Combined score for heatmap: good grazing = green, danger = red
      const combined = veg * 0.5 + w.score * 0.3 - conf * 0.2;

      cells.push({
        lat,
        lng,
        vegetation: veg,
        vegetationLabel,
        water: w.score,
        distToWaterKm: w.distKm,
        rainfall: Math.max(0, (scenario.rainfallAnomaly + 1) / 2 + seededRandom(lat * 73 + lng * 37 + scenario.day) * 0.2 - 0.1),
        conflictHistory: conf,
        combined: Math.max(0, Math.min(1, combined)),
      });
    }
  }
  return cells;
}
