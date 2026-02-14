// Jonglei–Bor–Sudd corridor (WGS84)
// Focus area: Jonglei State, eastern Lakes — the cattle migration hotspot
// Data grid: ~5.5°N–8.2°N, 30.0°E–33.5°E
// viewBbox adds padding so herds at edges are fully visible & pannable
export const SOUTH_SUDAN_BOUNDS = {
  center: [6.85, 31.75] as [number, number],
  zoom: 8,
  bbox: { south: 5.5, north: 8.2, west: 30.0, east: 33.5 },
  viewBbox: { south: 4.5, north: 9.2, west: 28.5, east: 35.0 },
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
