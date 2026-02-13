/**
 * Environment Layer Engine — Jonglei–Bor–Sudd Corridor
 * =====================================================
 * Static + dynamic environmental layers for the Jonglei–Bor–Sudd
 * cattle migration corridor (~5.5°N–8.2°N, 30.0°E–33.5°E).
 *
 * In production these come from real satellite datasets:
 *   - Vegetation: MODIS NDVI / Sentinel-2 derived NDVI
 *   - Water: JRC Global Surface Water / HydroSHEDS
 *   - Rainfall: CHIRPS 2.0
 *   - Conflict zones: ACLED event data
 *   - Cattle camps: ONS Sentinel-2 predictions
 *
 * For the simulator we generate plausible synthetic layers
 * seeded from known geography of the corridor.
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

// ── Static data: water bodies in Jonglei–Bor–Sudd corridor ──
// Sources: HDX South Sudan Rivers, HydroSHEDS, JRC Surface Water

export const WATER_BODIES: WaterBody[] = [
  // White Nile / Bahr el Jebel through the corridor
  { id: "w1", name: "Bahr el Jebel (Bor)", lat: 6.21, lng: 31.56, type: "river" },
  { id: "w2", name: "Bahr el Jebel (Kongor)", lat: 6.80, lng: 31.45, type: "river" },
  { id: "w3", name: "Bahr el Jebel (Duk)", lat: 7.10, lng: 31.30, type: "river" },
  // Sudd wetland — the massive seasonal swamp
  { id: "w4", name: "Sudd Wetland (Central)", lat: 7.50, lng: 30.50, type: "wetland" },
  { id: "w5", name: "Sudd Wetland (East)", lat: 7.30, lng: 31.00, type: "wetland" },
  { id: "w6", name: "Sudd Wetland (South)", lat: 6.90, lng: 30.80, type: "wetland" },
  { id: "w7", name: "Sudd Wetland (North)", lat: 7.80, lng: 30.60, type: "wetland" },
  // Pibor River system (eastern edge)
  { id: "w8", name: "Pibor River (South)", lat: 6.50, lng: 32.90, type: "river" },
  { id: "w9", name: "Pibor River (Central)", lat: 6.80, lng: 33.10, type: "river" },
  { id: "w10", name: "Pibor River (North)", lat: 7.30, lng: 32.90, type: "river" },
  // Seasonal toic (floodplain) water points — critical for dry season grazing
  { id: "w11", name: "Twic East toic", lat: 6.60, lng: 31.90, type: "seasonal" },
  { id: "w12", name: "Duk toic", lat: 7.00, lng: 31.20, type: "seasonal" },
  { id: "w13", name: "Ayod marsh", lat: 7.70, lng: 31.30, type: "seasonal" },
  { id: "w14", name: "Lake Nyibor", lat: 7.20, lng: 31.60, type: "lake" },
  { id: "w15", name: "Kangen seasonal pond", lat: 6.30, lng: 30.80, type: "seasonal" },
];

// ── Static data: villages / settlements in Jonglei–Bor–Sudd corridor ──
// Sources: HDX OSM populated places, OCHA admin boundaries

export const VILLAGES: Village[] = [
  { id: "v1", name: "Bor", lat: 6.21, lng: 31.56, population: 80000 },
  { id: "v2", name: "Kongor", lat: 6.80, lng: 31.50, population: 12000 },
  { id: "v3", name: "Duk Padiet", lat: 7.05, lng: 31.30, population: 8000 },
  { id: "v4", name: "Ayod", lat: 7.65, lng: 31.40, population: 10000 },
  { id: "v5", name: "Waat", lat: 7.90, lng: 31.80, population: 7000 },
  { id: "v6", name: "Pibor", lat: 6.80, lng: 33.13, population: 12000 },
  { id: "v7", name: "Akobo", lat: 7.78, lng: 33.00, population: 8000 },
  { id: "v8", name: "Twic East (Panyagor)", lat: 6.55, lng: 31.80, population: 6000 },
  { id: "v9", name: "Duk Faiwil", lat: 6.90, lng: 31.25, population: 4000 },
  { id: "v10", name: "Pochalla", lat: 6.10, lng: 32.65, population: 5000 },
  { id: "v11", name: "Lankien", lat: 7.55, lng: 32.10, population: 5000 },
  { id: "v12", name: "Yuai", lat: 7.40, lng: 32.40, population: 4000 },
  { id: "v13", name: "Motot", lat: 6.35, lng: 31.70, population: 3000 },
  { id: "v14", name: "Pakuau", lat: 6.60, lng: 31.60, population: 3500 },
  { id: "v15", name: "Maar", lat: 7.20, lng: 31.50, population: 2500 },
  { id: "v16", name: "Kolnyang", lat: 6.10, lng: 31.50, population: 5000 },
  { id: "v17", name: "Pariak", lat: 6.40, lng: 31.40, population: 3000 },
  { id: "v18", name: "Wernyol", lat: 6.70, lng: 31.20, population: 2500 },
  { id: "v19", name: "Padak", lat: 6.50, lng: 31.55, population: 4000 },
  { id: "v20", name: "Baidit", lat: 6.25, lng: 31.70, population: 3500 },
];

// ── Static data: known conflict-prone areas in corridor (from ACLED patterns) ──
// Focused on Dinka-Nuer and Dinka-Murle cattle raiding zones

export const CONFLICT_ZONES: ConflictZone[] = [
  { id: "cz1", name: "Greater Pibor (Murle cattle raiding)", lat: 6.80, lng: 33.10, radiusKm: 40, severity: "high" },
  { id: "cz2", name: "Bor–Twic East corridor (interclan)", lat: 6.45, lng: 31.70, radiusKm: 25, severity: "high" },
  { id: "cz3", name: "Duk–Ayod border (Dinka-Nuer)", lat: 7.30, lng: 31.40, radiusKm: 30, severity: "high" },
  { id: "cz4", name: "Uror–Akobo (Lou Nuer-Murle)", lat: 7.80, lng: 32.80, radiusKm: 35, severity: "high" },
  { id: "cz5", name: "Sudd fringe (land access tensions)", lat: 7.10, lng: 30.80, radiusKm: 20, severity: "medium" },
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
