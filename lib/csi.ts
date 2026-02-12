/**
 * Composite Suitability Index (CSI) — Cattle Movement Model
 * ==========================================================
 * Implements the evidence-based framework from docs/METRICS_AND_SOURCES.md.
 * Eight factors, normalized indices (0–1), weighted CSI, movement likelihood bands,
 * and path cost for least-cost prediction.
 */

// ── Factor ranks (1–10) and weights (Rank/10) ────────────────────────

export const FACTOR_RANKS = {
  ndvi: 10,
  geospatial: 9,
  rainfall: 9,
  waterBodies: 9,
  floodExtent: 8,
  soilMoisture: 8,
  evapotranspiration: 7,
  landSurfaceTemp: 6,
} as const;

export const FACTOR_WEIGHTS: Record<keyof typeof FACTOR_RANKS, number> = {
  ndvi: FACTOR_RANKS.ndvi / 10,
  geospatial: FACTOR_RANKS.geospatial / 10,
  rainfall: FACTOR_RANKS.rainfall / 10,
  waterBodies: FACTOR_RANKS.waterBodies / 10,
  floodExtent: FACTOR_RANKS.floodExtent / 10,
  soilMoisture: FACTOR_RANKS.soilMoisture / 10,
  evapotranspiration: FACTOR_RANKS.evapotranspiration / 10,
  landSurfaceTemp: FACTOR_RANKS.landSurfaceTemp / 10,
};

// ── Raw factor values (mock or from APIs) ─────────────────────────────

export type FactorValues = {
  /** mm/day (CHIRPS) */
  rainfallMmDay: number;
  /** 0–1 (MODIS/Sentinel-2 NDVI) */
  ndvi: number;
  /** volumetric % 0–100 (SMAP/Sentinel-1) */
  soilMoisturePct: number;
  /** % extent or proxy 0–100 within 10km (water) */
  waterExtentPct: number;
  /** mm/day (MODIS/WaPOR ET) */
  evapotranspirationMmDay: number;
  /** °C (MODIS LST) */
  landSurfaceTempC: number;
  /** % flooded 0–100 (MODIS/Sentinel-1) */
  floodExtentPct: number;
  /** km to nearest fresh water */
  distToWaterKm: number;
  /** m above local mean (elevation) */
  elevationAboveLocalM: number;
  /** conflict incidents per month (ACLED proxy) */
  conflictIncidentsPerMonth: number;
};

// ── Index calculation per factor (spec: low/moderate/high → Index) ────

/** Rainfall: Low <5 → 0.2, Moderate 5–20 → 0.8, High >20 → 0.3 */
export function indexRainfall(mmPerDay: number): number {
  if (mmPerDay < 5) return 0.2;
  if (mmPerDay <= 20) return 0.8;
  return 0.3;
}

/** NDVI: Low <0.2 → 0.1, Moderate 0.2–0.5 → 0.6, High >0.5 → 1.0 */
export function indexNDVI(ndvi: number): number {
  if (ndvi < 0.2) return 0.1;
  if (ndvi <= 0.5) return 0.6;
  return 1.0;
}

/** Soil moisture %: Low <20 → 0.2, Moderate 20–40 → 0.7, High >40 → 0.4 */
export function indexSoilMoisture(pct: number): number {
  if (pct < 20) return 0.2;
  if (pct <= 40) return 0.7;
  return 0.4;
}

/** Water extent %: Low <10 → 0.1, Moderate 10–30 → 0.8, High >30 → 0.9 */
export function indexWaterExtent(pct: number): number {
  if (pct < 10) return 0.1;
  if (pct <= 30) return 0.8;
  return 0.9;
}

/** Evapotranspiration mm/day: Low <2 → 0.9, Moderate 2–5 → 0.6, High >5 → 0.3 */
export function indexEvapotranspiration(mmPerDay: number): number {
  if (mmPerDay < 2) return 0.9;
  if (mmPerDay <= 5) return 0.6;
  return 0.3;
}

/** Land surface temp °C: Low <25 → 1.0, Moderate 25–30 → 0.7, High >30 → 0.4 */
export function indexLandSurfaceTemp(c: number): number {
  if (c < 25) return 1.0;
  if (c <= 30) return 0.7;
  return 0.4;
}

/** Flood extent %: Low <5 → 1.0, Moderate 5–10 → 0.5, High >10 → 0.1 */
export function indexFloodExtent(pct: number): number {
  if (pct < 5) return 1.0;
  if (pct <= 10) return 0.5;
  return 0.1;
}

/** Geospatial: water <5km → 1.0, 5–20 → 0.6, >20 → 0.2; elevation >50m → 0.8 else 0.4; conflict 0 → 1, 1–5 → 0.5, >5 → 0.1. Combined as average of three sub-indices. */
export function indexGeospatial(
  distToWaterKm: number,
  elevationAboveLocalM: number,
  conflictIncidentsPerMonth: number
): number {
  const waterIdx = distToWaterKm < 5 ? 1.0 : distToWaterKm <= 20 ? 0.6 : 0.2;
  const elevIdx = elevationAboveLocalM >= 50 ? 0.8 : 0.4;
  const conflictIdx =
    conflictIncidentsPerMonth === 0 ? 1.0 : conflictIncidentsPerMonth <= 5 ? 0.5 : 0.1;
  return (waterIdx * 0.4 + elevIdx * 0.3 + conflictIdx * 0.3);
}

// ── Compute all indices from raw factor values ────────────────────────

export type FactorIndices = {
  ndvi: number;
  geospatial: number;
  rainfall: number;
  waterBodies: number;
  floodExtent: number;
  soilMoisture: number;
  evapotranspiration: number;
  landSurfaceTemp: number;
};

export function computeFactorIndices(values: FactorValues): FactorIndices {
  return {
    ndvi: indexNDVI(values.ndvi),
    geospatial: indexGeospatial(
      values.distToWaterKm,
      values.elevationAboveLocalM,
      values.conflictIncidentsPerMonth
    ),
    rainfall: indexRainfall(values.rainfallMmDay),
    waterBodies: indexWaterExtent(values.waterExtentPct),
    floodExtent: indexFloodExtent(values.floodExtentPct),
    soilMoisture: indexSoilMoisture(values.soilMoisturePct),
    evapotranspiration: indexEvapotranspiration(values.evapotranspirationMmDay),
    landSurfaceTemp: indexLandSurfaceTemp(values.landSurfaceTempC),
  };
}

// ── Composite Suitability Index: CSI = Σ (Index_i × Weight_i) ─────────

export function computeCSI(indices: FactorIndices): number {
  let csi = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(FACTOR_WEIGHTS)) {
    const idx = indices[key as keyof FactorIndices];
    if (typeof idx === "number") {
      csi += idx * weight;
      totalWeight += weight;
    }
  }
  return totalWeight > 0 ? Math.max(0, Math.min(1, csi / totalWeight)) : 0;
}

// ── Movement likelihood by CSI band (spec: 20–40% high, 50–70% moderate, 80–95% low) ─────

export type MovementBand = "high" | "moderate" | "low";

export type MovementLikelihood = {
  band: MovementBand;
  /** Probability of movement (0–1); spec: High 20–40%, Moderate 50–70%, Low 80–95% */
  likelihoodPct: number;
  /** Typical movement distance (km); spec: short <20 km, long 50–400 km */
  moveKmMin: number;
  moveKmMax: number;
  /** Human-readable */
  description: string;
};

export function getMovementLikelihood(csi: number): MovementLikelihood {
  if (csi > 0.7) {
    return {
      band: "high",
      likelihoodPct: 0.3,   // spec: 20–40% (stay put)
      moveKmMin: 0,
      moveKmMax: 5,
      description: "Stay put; high suitability (CSI >0.7).",
    };
  }
  if (csi >= 0.4) {
    return {
      band: "moderate",
      likelihoodPct: 0.6,   // spec: 50–70% (short moves)
      moveKmMin: 5,
      moveKmMax: 20,
      description: "Short moves <20 km; moderate suitability (CSI 0.4–0.7).",
    };
  }
  return {
    band: "low",
    likelihoodPct: 0.9,     // spec: 80–95% (long moves 50–400 km)
    moveKmMin: 50,
    moveKmMax: 400,
    description: "Long moves 50–400 km to better CSI areas; low suitability (CSI <0.4).",
  };
}

// ── Path cost for least-cost routing: cost = 1/CSI + penalties ───────

export function getPathCost(
  csi: number,
  options: { conflictPenalty?: number; floodPenalty?: number } = {}
): number {
  const safeCsi = Math.max(0.01, Math.min(1, csi));
  const base = 1 / safeCsi;
  const conflict = options.conflictPenalty ?? 0;
  const flood = options.floodPenalty ?? 0;
  return base + conflict + flood;
}

// ── Likelihood message (Bayesian-style output) ─────────────────────────

export function getLikelihoodMessage(
  csi: number,
  dominantFactor: string,
  direction: string,
  distanceKm: number
): string {
  const band = getMovementLikelihood(csi);
  const pct = Math.round(band.likelihoodPct * 100);
  return `${pct}% likelihood of moving ${distanceKm} km ${direction} due to ${dominantFactor}. CSI=${csi.toFixed(2)} (${band.band} suitability).`;
}
