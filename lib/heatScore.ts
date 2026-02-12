/**
 * Heat Score = Radar Disturbance + NDVI Decline + Distance to Water + Seasonal Weighting
 * PRD: probabilistic cattle density proxy from environmental signals only.
 */

export type ScenarioParams = {
  rainfallAnomaly: number; // -1 to 1 (drought to wet)
  droughtSeverity: number; // 0 to 1
  floodExtent: number; // 0 to 1
  seasonalShift: number; // weeks, -4 to 4
};

export function computeHeatScore(
  radarDisturbance: number,
  ndviDecline: number,
  distanceToWater: number,
  seasonalWeight: number,
  scenario: Partial<ScenarioParams> = {}
): number {
  let r = Math.max(0, Math.min(1, radarDisturbance));
  let n = Math.max(0, Math.min(1, ndviDecline));
  let d = Math.max(0, Math.min(1, distanceToWater));
  let s = Math.max(0, Math.min(1, seasonalWeight));

  // Scenario adjustments
  if (scenario.droughtSeverity !== undefined) {
    n = Math.min(1, n + scenario.droughtSeverity * 0.3);
    d = Math.min(1, d + scenario.droughtSeverity * 0.2);
  }
  if (scenario.floodExtent !== undefined) {
    d = Math.max(0, d - scenario.floodExtent * 0.4);
  }
  if (scenario.rainfallAnomaly !== undefined) {
    const rain = (scenario.rainfallAnomaly + 1) / 2;
    s = s * (0.7 + 0.3 * rain);
  }

  const score =
    0.35 * r + 0.3 * n + 0.2 * d + 0.15 * s;
  return Math.max(0, Math.min(1, score));
}

export function heatToPressureLevel(heat: number): "low" | "medium" | "high" {
  if (heat < 0.33) return "low";
  if (heat < 0.66) return "medium";
  return "high";
}
