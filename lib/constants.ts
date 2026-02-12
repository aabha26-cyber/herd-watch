// South Sudan approximate bounds (WGS84)
// Ref: ~3.5°N–12°N, 23.5°E–36°E
export const SOUTH_SUDAN_BOUNDS = {
  center: [7.75, 29.75] as [number, number],
  zoom: 6,
  bbox: { south: 3.5, north: 12, west: 23.5, east: 36 },
};

// Grid resolution: ~0.05° (~5km) for safe regional aggregation (PRD: 10–30m aggregated)
export const GRID_STEP = 0.05;

// Heat score formula weights (PRD)
export const HEAT_WEIGHTS = {
  radarDisturbance: 0.35,
  ndviDecline: 0.3,
  distanceToWater: 0.2,
  seasonalWeight: 0.15,
};
