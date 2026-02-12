/**
 * Movement Prediction Engine — CSI-Based
 * =======================================
 * Implements docs/METRICS_AND_SOURCES.md: 8 factors → indices → Composite
 * Suitability Index (CSI). Path cost = 1/CSI + conflict/flood penalties.
 * Movement likelihood bands: high CSI → stay; moderate → short (<20 km);
 * low CSI → long (50–400 km) toward better areas.
 */

import { getFactorValuesAt } from "./mockFactors";
import {
  computeFactorIndices,
  computeCSI,
  getMovementLikelihood,
  getPathCost,
  getLikelihoodMessage,
  type FactorIndices,
} from "./csi";
import { SOUTH_SUDAN_BOUNDS } from "./constants";
import type { DayScenario } from "./environment";

// ── Types ─────────────────────────────────────────────────

export type SimHerd = {
  id: string;
  lat: number;
  lng: number;
  size: number;
  confidence: number;
  speedKmDay: number;
  trail: { lat: number; lng: number; day: number }[];
  predicted: { lat: number; lng: number; day: number }[];
  decisionReason: string;
  /** CSI at current location (0–1) */
  csi?: number;
  /** Movement band from spec */
  movementBand?: "high" | "moderate" | "low";
}

export type MovementCandidate = {
  lat: number;
  lng: number;
  csi: number;
  cost: number;
  indices: FactorIndices;
};

// ── Herd seeds (FAO GLW4 / ONS cattle camp–style locations) ──

const HERD_SEEDS: { id: string; baseLat: number; baseLng: number; speed: number; size: number }[] = [
  { id: "H1", baseLat: 8.2, baseLng: 27.5, speed: 20, size: 0.85 },
  { id: "H2", baseLat: 6.8, baseLng: 30.2, speed: 18, size: 0.7 },
  { id: "H3", baseLat: 9.5, baseLng: 31.0, speed: 22, size: 0.9 },
  { id: "H4", baseLat: 5.2, baseLng: 31.8, speed: 16, size: 0.5 },
  { id: "H5", baseLat: 7.0, baseLng: 25.0, speed: 19, size: 0.75 },
  { id: "H6", baseLat: 10.2, baseLng: 29.5, speed: 21, size: 0.8 },
  { id: "H7", baseLat: 4.5, baseLng: 28.0, speed: 15, size: 0.45 },
  { id: "H8", baseLat: 8.8, baseLng: 33.2, speed: 23, size: 0.95 },
  { id: "H9", baseLat: 6.0, baseLng: 26.5, speed: 17, size: 0.6 },
  { id: "H10", baseLat: 9.0, baseLng: 27.0, speed: 20, size: 0.7 },
  { id: "H11", baseLat: 5.8, baseLng: 34.0, speed: 18, size: 0.55 },
  { id: "H12", baseLat: 7.5, baseLng: 32.5, speed: 22, size: 0.85 },
];

const DIR_NAMES = ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"];
const FACTOR_LABELS: Record<keyof FactorIndices, string> = {
  ndvi: "vegetation/forage (NDVI)",
  geospatial: "geospatial (water/elevation/conflict)",
  rainfall: "rainfall",
  waterBodies: "water bodies extent",
  floodExtent: "flood extent",
  soilMoisture: "soil moisture",
  evapotranspiration: "evapotranspiration",
  landSurfaceTemp: "land surface temperature",
};

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

// ── Evaluate candidate: CSI + path cost ────────────────────

function evaluateCandidate(
  candidateLat: number,
  candidateLng: number,
  scenario: DayScenario
): MovementCandidate {
  const values = getFactorValuesAt(candidateLat, candidateLng, scenario);
  const indices = computeFactorIndices(values);
  const csi = computeCSI(indices);

  const conflictPenalty = values.conflictIncidentsPerMonth > 5 ? 1.5 : values.conflictIncidentsPerMonth * 0.2;
  const floodPenalty = values.floodExtentPct > 10 ? 1.5 : values.floodExtentPct / 50;
  const cost = getPathCost(csi, { conflictPenalty, floodPenalty });

  return { lat: candidateLat, lng: candidateLng, csi, cost, indices };
}

/** Dominant factor driving movement = factor with lowest index (most unfavorable). */
function dominantFactor(indices: FactorIndices): keyof FactorIndices {
  let key: keyof FactorIndices = "ndvi";
  let min = 1;
  for (const k of Object.keys(indices) as (keyof FactorIndices)[]) {
    if (indices[k] < min) {
      min = indices[k];
      key = k;
    }
  }
  return key;
}

/**
 * Move herd one day: choose direction that minimizes path cost (maximizes CSI, avoids conflict/flood).
 * Daily distance follows CSI band: high → 0–5 km, moderate → <20 km, low → up to 100 km/day toward better CSI.
 */
function moveHerdOneDay(
  lat: number,
  lng: number,
  herdId: string,
  speedKmDay: number,
  scenario: DayScenario,
  prevDirection?: { lat: number; lng: number }
): { lat: number; lng: number; reason: string; csi: number; band: "high" | "moderate" | "low"; candidate: MovementCandidate } {
  const dayScenario: DayScenario = { ...scenario, day: scenario.day };
  const currentValues = getFactorValuesAt(lat, lng, dayScenario);
  const currentIndices = computeFactorIndices(currentValues);
  const currentCsi = computeCSI(currentIndices);
  const band = getMovementLikelihood(currentCsi).band;

  // Step size by band (spec: high 0–5 km, moderate <20 km, low 50–400 km total; we apply per-day cap)
  const kmThisDay =
    band === "high"
      ? 2 + seededRandom(lat * 100 + lng * 50 + scenario.day) * 3
      : band === "moderate"
      ? Math.min(speedKmDay, 15 + seededRandom(lat * 77 + lng * 33) * 5)
      : Math.min(speedKmDay * 1.2, 80);
  const stepDeg = kmThisDay / 111;

  const directions = [
    { dlat: stepDeg, dlng: 0 },
    { dlat: stepDeg, dlng: stepDeg },
    { dlat: 0, dlng: stepDeg },
    { dlat: -stepDeg, dlng: stepDeg },
    { dlat: -stepDeg, dlng: 0 },
    { dlat: -stepDeg, dlng: -stepDeg },
    { dlat: 0, dlng: -stepDeg },
    { dlat: stepDeg, dlng: -stepDeg },
  ];

  const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;

  let best: MovementCandidate | null = null;
  let bestIdx = 0;

  for (let i = 0; i < directions.length; i++) {
    const d = directions[i];
    const jitter = (seededRandom(scenario.day * 13 + i * 7 + lat * 100 + lng * 100) - 0.5) * stepDeg * 0.2;
    const cLat = lat + d.dlat + jitter;
    const cLng = lng + d.dlng + jitter;
    const inBounds =
      cLat >= south + 0.2 && cLat <= north - 0.2 && cLng >= west + 0.2 && cLng <= east - 0.2;
    if (!inBounds) continue;

    const candidate = evaluateCandidate(cLat, cLng, dayScenario);
    if (!best || candidate.cost < best.cost) {
      best = candidate;
      bestIdx = i;
    }
  }

  if (!best) {
    const fallback: MovementCandidate = {
      lat,
      lng,
      csi: currentCsi,
      cost: getPathCost(currentCsi),
      indices: currentIndices,
    };
    return {
      lat,
      lng,
      reason: getLikelihoodMessage(currentCsi, "no viable move (bounds)", "—", 0),
      csi: currentCsi,
      band,
      candidate: fallback,
    };
  }

  const dom = dominantFactor(best.indices);
  const reason = getLikelihoodMessage(
    best.csi,
    FACTOR_LABELS[dom],
    DIR_NAMES[bestIdx],
    Math.round(kmThisDay)
  );

  return {
    lat: best.lat,
    lng: best.lng,
    reason,
    csi: best.csi,
    band: getMovementLikelihood(best.csi).band,
    candidate: best,
  };
}

// ── Simulate all herds, 2–7 day forecast ──────────────────

export function simulateHerds(
  currentDay: number,
  forecastDays: number,
  scenario: Omit<DayScenario, "day">
): SimHerd[] {
  const herds: SimHerd[] = [];

  for (const seed of HERD_SEEDS) {
    let lat = seed.baseLat;
    let lng = seed.baseLng;
    let prevDir: { lat: number; lng: number } | undefined;
    const trail: SimHerd["trail"] = [];

    const pastDays = Math.min(currentDay, 7);
    for (let d = currentDay - pastDays; d <= currentDay; d++) {
      const dayScenario: DayScenario = { ...scenario, day: d };
      const result = moveHerdOneDay(lat, lng, seed.id, seed.speed, dayScenario, prevDir);
      prevDir = { lat, lng };
      lat = result.lat;
      lng = result.lng;
      trail.push({ lat, lng, day: d });
    }

    const predicted: SimHerd["predicted"] = [];
    let fLat = lat;
    let fLng = lng;
    let fPrevDir = prevDir;
    let lastReason = "";
    let lastCsi = 0.5;
    let lastBand: "high" | "moderate" | "low" = "moderate";

    for (let d = 1; d <= forecastDays; d++) {
      const dayScenario: DayScenario = { ...scenario, day: currentDay + d };
      const result = moveHerdOneDay(fLat, fLng, seed.id, seed.speed, dayScenario, fPrevDir);
      fPrevDir = { lat: fLat, lng: fLng };
      fLat = result.lat;
      fLng = result.lng;
      lastReason = result.reason;
      lastCsi = result.csi;
      lastBand = result.band;
      predicted.push({ lat: fLat, lng: fLng, day: currentDay + d });
    }

    const confidence = 0.7 + seededRandom(seed.baseLat * 100 + seed.baseLng * 50 + currentDay) * 0.25;

    herds.push({
      id: seed.id,
      lat,
      lng,
      size: seed.size,
      confidence,
      speedKmDay: seed.speed,
      trail,
      predicted,
      decisionReason: lastReason,
      csi: lastCsi,
      movementBand: lastBand,
    });
  }

  return herds;
}

export function getHerdsAtDay(
  baseDay: number,
  dayOffset: number,
  forecastDays: number,
  scenario: Omit<DayScenario, "day">
): SimHerd[] {
  const herds = simulateHerds(baseDay, forecastDays, scenario);
  if (dayOffset === 0) return herds;

  return herds.map((h) => {
    const pred = h.predicted[dayOffset - 1];
    if (pred) {
      return {
        ...h,
        lat: pred.lat,
        lng: pred.lng,
        confidence: h.confidence * (1 - dayOffset * 0.08),
      };
    }
    return h;
  });
}
