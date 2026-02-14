/**
 * Environment grid with CSI for heatmap
 * Uses real/fallback factors + CSI so the map shows Composite Suitability Index (spec).
 */

import { SOUTH_SUDAN_BOUNDS } from "./constants";
import { getFactorValuesAt } from "./data/realFactors";
import { computeFactorIndices, computeCSI } from "./csi";
import type { EnvironmentCell, VegetationQuality } from "./environment";
import type { DayScenario } from "./environment";

/**
 * Build environment grid with combined = CSI (0–1) for heatmap.
 * High CSI = green (favorable), low CSI = red (unfavorable).
 */
export function generateEnvironmentGridWithCSI(
  scenario: DayScenario,
  step = 0.3
): EnvironmentCell[] {
  const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;
  const cells: EnvironmentCell[] = [];

  for (let lat = south; lat <= north; lat += step) {
    for (let lng = west; lng <= east; lng += step) {
      const values = getFactorValuesAt(lat, lng, scenario);
      const indices = computeFactorIndices(values);
      const csi = computeCSI(indices);

      const veg = values.ndvi;
      const vegetationLabel: VegetationQuality =
        veg < 0.33 ? "low" : veg < 0.66 ? "medium" : "high";
      const waterScore = Math.min(1, values.waterExtentPct / 30);
      const conflictHistory = Math.min(1, values.conflictIncidentsPerMonth / 8);
      const rainfall = Math.min(1, values.rainfallMmDay / 20);

      cells.push({
        lat,
        lng,
        vegetation: veg,
        vegetationLabel,
        water: waterScore,
        distToWaterKm: values.distToWaterKm,
        rainfall,
        conflictHistory,
        combined: csi,
      });
    }
  }
  return cells;
}
