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

/**
 * Fixed herd "seeds" – base locations along the Jonglei–Bor–Sudd corridor.
 * Positioned on realistic cattle camp areas: Dinka Bor toic grazing,
 * Twic East, Duk County, Sudd fringe, and Nuer/Murle border zones.
 * Coordinates sourced from ONS cattle camp study + FAO GLW4 density data.
 */
const HERD_SEEDS: { id: string; baseLat: number; baseLng: number; seed: number }[] = [
  { id: "H1", baseLat: 6.25, baseLng: 31.55, seed: 101 },  // Bor town — Dinka Bor herds
  { id: "H2", baseLat: 6.55, baseLng: 31.80, seed: 102 },  // Twic East — Dinka Twic herds
  { id: "H3", baseLat: 7.10, baseLng: 31.35, seed: 103 },  // Duk County — Dinka Duk herds
  { id: "H4", baseLat: 5.90, baseLng: 31.50, seed: 104 },  // South of Bor — herds moving north
  { id: "H5", baseLat: 7.40, baseLng: 30.70, seed: 105 },  // Sudd edge west — toic grazing
  { id: "H6", baseLat: 7.65, baseLng: 31.40, seed: 106 },  // Ayod area — Lou Nuer herds
  { id: "H7", baseLat: 7.80, baseLng: 32.20, seed: 107 },  // Uror County — Nuer herds
  { id: "H8", baseLat: 6.70, baseLng: 32.80, seed: 108 },  // Pibor approach — Murle-Dinka border
  { id: "H9", baseLat: 6.40, baseLng: 30.40, seed: 109 },  // Sudd lake margins — western fringe
  { id: "H10", baseLat: 6.10, baseLng: 32.60, seed: 110 }, // Pochalla corridor — eastern
  { id: "H11", baseLat: 6.80, baseLng: 31.50, seed: 111 }, // Kongor — central Jonglei
  { id: "H12", baseLat: 7.90, baseLng: 31.80, seed: 112 }, // Waat area — northern herds
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
  // Smaller amplitude for corridor-scale movement (~20-30 km seasonal shifts)
  const seasonalLat = 0.2 * Math.sin(t * Math.PI * 2) * (1 + (scenario.seasonalShift ?? 0) * 0.1);
  const seasonalLng = 0.25 * Math.cos(t * Math.PI * 2 + 0.5) * (1 + (scenario.seasonalShift ?? 0) * 0.1);
  const drought = (scenario.droughtSeverity ?? 0) * 0.15;
  const flood = (scenario.floodExtent ?? 0) * 0.1;
  const rain = (scenario.rainfallAnomaly ?? 0) * 0.08;
  const driftLat = (seededRandom(seed + weekIndex * 7) - 0.5) * 0.1;
  const driftLng = (seededRandom(seed + weekIndex * 11) - 0.5) * 0.1;
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
