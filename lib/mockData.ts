import { SOUTH_SUDAN_BOUNDS, GRID_STEP } from "./constants";
import { computeHeatScore, type ScenarioParams } from "./heatScore";

export type GridCell = {
  lat: number;
  lng: number;
  heat: number;
  confidence: number;
  isCongestion?: boolean;
};

const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;

function seededRandom(seed: number) {
  const x = Math.sin(seed * 9999) * 10000;
  return x - Math.floor(x);
}

export function generateGridForWeek(
  weekIndex: number,
  scenario: Partial<ScenarioParams> = {}
): GridCell[] {
  const cells: GridCell[] = [];
  for (let lat = south; lat < north; lat += GRID_STEP) {
    for (let lng = west; lng < east; lng += GRID_STEP) {
      const seed = (lat * 100 + lng) * 17 + weekIndex * 31;
      const radar = seededRandom(seed);
      const ndvi = seededRandom(seed + 1);
      const water = 1 - seededRandom(seed + 2) * 0.6;
      const seasonal = 0.3 + 0.5 * Math.sin((weekIndex / 52) * Math.PI * 2 + lat * 0.5) * 0.5 + 0.5;
      const heat = computeHeatScore(radar, ndvi, water, seasonal, scenario);
      const confidence = 0.6 + seededRandom(seed + 3) * 0.35;
      const isCongestion = heat > 0.65 && confidence > 0.7;
      cells.push({ lat, lng, heat, confidence, isCongestion });
    }
  }
  return cells;
}

export function getWeeksForPlayback(count: number = 24): { label: string; weekIndex: number }[] {
  const weeks: { label: string; weekIndex: number }[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date();
    d.setDate(d.getDate() - (count - 1 - i) * 7);
    weeks.push({
      label: `W${i + 1} ${d.toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}`,
      weekIndex: i,
    });
  }
  return weeks;
}
