import { SOUTH_SUDAN_BOUNDS } from "./constants";
import type { ScenarioParams } from "./heatScore";

export type Herd = {
  id: string;
  lat: number;
  lng: number;
  /** Relative size (e.g. inferred from satellite signal strength) */
  size: number;
  confidence: number;
  /** Previous week position for movement trail */
  prevLat?: number;
  prevLng?: number;
};

const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

/** Fixed herd "seeds" – base locations inferred from typical grazing corridors (demo). */
const HERD_SEEDS: { id: string; baseLat: number; baseLng: number; seed: number }[] = [
  { id: "H1", baseLat: 8.2, baseLng: 27.5, seed: 101 },
  { id: "H2", baseLat: 6.8, baseLng: 30.2, seed: 102 },
  { id: "H3", baseLat: 9.5, baseLng: 31.0, seed: 103 },
  { id: "H4", baseLat: 5.2, baseLng: 31.8, seed: 104 },
  { id: "H5", baseLat: 7.0, baseLng: 25.0, seed: 105 },
  { id: "H6", baseLat: 10.2, baseLng: 29.5, seed: 106 },
  { id: "H7", baseLat: 4.5, baseLng: 28.0, seed: 107 },
  { id: "H8", baseLat: 8.8, baseLng: 33.2, seed: 108 },
  { id: "H9", baseLat: 6.0, baseLng: 26.5, seed: 109 },
  { id: "H10", baseLat: 9.0, baseLng: 27.0, seed: 110 },
  { id: "H11", baseLat: 5.8, baseLng: 34.0, seed: 111 },
  { id: "H12", baseLat: 7.5, baseLng: 32.5, seed: 112 },
];

/**
 * Position for a herd at a given week. Movement is driven by season (wet/dry)
 * and scenario (drought, flood, rainfall). No GPS – inferred from environmental signals.
 */
function herdPositionAtWeek(
  baseLat: number,
  baseLng: number,
  weekIndex: number,
  seed: number,
  scenario: Partial<ScenarioParams>
): { lat: number; lng: number } {
  const t = weekIndex / 52;
  const seasonalLat = 0.4 * Math.sin(t * Math.PI * 2) * (1 + (scenario.seasonalShift ?? 0) * 0.1);
  const seasonalLng = 0.5 * Math.cos(t * Math.PI * 2 + 0.5) * (1 + (scenario.seasonalShift ?? 0) * 0.1);
  const drought = (scenario.droughtSeverity ?? 0) * 0.3;
  const flood = (scenario.floodExtent ?? 0) * 0.2;
  const rain = (scenario.rainfallAnomaly ?? 0) * 0.15;
  const driftLat = (seededRandom(seed + weekIndex * 7) - 0.5) * 0.2;
  const driftLng = (seededRandom(seed + weekIndex * 11) - 0.5) * 0.2;
  return {
    lat: baseLat + seasonalLat + drought - flood + rain + driftLat,
    lng: baseLng + seasonalLng - drought * 0.5 + flood * 0.3 + driftLng,
  };
}

export function getHerdsWithTrails(
  weekIndex: number,
  scenario: Partial<ScenarioParams> = {}
): Herd[] {
  const herds: Herd[] = [];
  for (const h of HERD_SEEDS) {
    const pos = herdPositionAtWeek(h.baseLat, h.baseLng, weekIndex, h.seed, scenario);
    const prev =
      weekIndex > 0
        ? herdPositionAtWeek(h.baseLat, h.baseLng, weekIndex - 1, h.seed, scenario)
        : null;
    const size = 0.5 + seededRandom(h.seed + weekIndex * 13) * 0.5;
    const confidence = 0.65 + seededRandom(h.seed + weekIndex * 17) * 0.3;
    herds.push({
      id: h.id,
      lat: pos.lat,
      lng: pos.lng,
      size,
      confidence,
      prevLat: prev ? prev.lat : undefined,
      prevLng: prev ? prev.lng : undefined,
    });
  }
  return herds;
}

export function getHerdsForWeek(
  weekIndex: number,
  scenario: Partial<ScenarioParams> = {}
): Herd[] {
  return getHerdsWithTrails(weekIndex, scenario);
}
