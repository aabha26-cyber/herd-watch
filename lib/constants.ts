// Jonglei–Bor–Sudd corridor (WGS84)
// Focus area: Jonglei State, eastern Lakes — the cattle migration hotspot
// Ref: ~5.5°N–8.2°N, 30.0°E–33.5°E
export const SOUTH_SUDAN_BOUNDS = {
  center: [6.85, 31.75] as [number, number],
  zoom: 8,
  bbox: { south: 5.5, north: 8.2, west: 30.0, east: 33.5 },
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
