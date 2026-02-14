import type { DayScenario } from "./environment";

export type RiskCategory = "community_protection" | "resource_tension";
export type SeasonBand = "dry" | "wet" | "transition";
export type CountyBand = "bor" | "duk" | "ayod" | "pibor" | "akobo" | "other";

export type RiskThresholdProfile = {
  county: CountyBand;
  season: SeasonBand;
  convergenceKm: number;
  villageProximityKm: number;
  farmProximityKm: number;
  resourceScarcityThreshold: number;
  historyThreshold: number;
};

type CountyRule = {
  county: CountyBand;
  bbox: { south: number; north: number; west: number; east: number };
  multipliers: {
    convergence: number;
    village: number;
    farm: number;
    scarcity: number;
    history: number;
  };
};

const BASE = {
  convergenceKm: 35,
  villageProximityKm: 30,
  farmProximityKm: 20,
  resourceScarcityThreshold: 0.35,
  historyThreshold: 0.3,
};

const COUNTY_RULES: CountyRule[] = [
  {
    county: "bor",
    bbox: { south: 5.9, north: 6.6, west: 31.2, east: 31.9 },
    multipliers: { convergence: 0.9, village: 1.1, farm: 1.15, scarcity: 1, history: 0.95 },
  },
  {
    county: "duk",
    bbox: { south: 6.6, north: 7.4, west: 31.0, east: 31.7 },
    multipliers: { convergence: 0.95, village: 1, farm: 1, scarcity: 0.95, history: 0.9 },
  },
  {
    county: "ayod",
    bbox: { south: 7.3, north: 8.2, west: 31.1, east: 32.2 },
    multipliers: { convergence: 1, village: 0.95, farm: 0.9, scarcity: 0.9, history: 0.9 },
  },
  {
    county: "pibor",
    bbox: { south: 6.0, north: 7.5, west: 32.3, east: 33.5 },
    multipliers: { convergence: 1.1, village: 1.2, farm: 1, scarcity: 1, history: 0.8 },
  },
  {
    county: "akobo",
    bbox: { south: 7.4, north: 8.2, west: 32.4, east: 33.5 },
    multipliers: { convergence: 1.05, village: 1.1, farm: 0.9, scarcity: 0.95, history: 0.85 },
  },
];

function seasonFromDay(day: number): SeasonBand {
  const doy = ((day % 365) + 365) % 365;
  // South Sudan approximation: wet ~Apr-Oct
  if (doy >= 100 && doy <= 285) return "wet";
  if ((doy >= 70 && doy < 100) || (doy > 285 && doy <= 320)) return "transition";
  return "dry";
}

function countyFromPoint(lat: number, lng: number): CountyBand {
  const found = COUNTY_RULES.find(
    (r) =>
      lat >= r.bbox.south &&
      lat <= r.bbox.north &&
      lng >= r.bbox.west &&
      lng <= r.bbox.east
  );
  return found?.county ?? "other";
}

function multipliersForCounty(county: CountyBand): CountyRule["multipliers"] {
  return (
    COUNTY_RULES.find((r) => r.county === county)?.multipliers ?? {
      convergence: 1,
      village: 1,
      farm: 1,
      scarcity: 1,
      history: 1,
    }
  );
}

function multipliersForSeason(season: SeasonBand) {
  if (season === "wet") {
    return { convergence: 0.95, village: 1, farm: 1, scarcity: 0.85, history: 1 };
  }
  if (season === "transition") {
    return { convergence: 1, village: 1, farm: 1, scarcity: 1, history: 1 };
  }
  return { convergence: 1.05, village: 1.1, farm: 1.1, scarcity: 1.15, history: 1 };
}

export function getRiskThresholdProfile(
  lat: number,
  lng: number,
  scenario: DayScenario
): RiskThresholdProfile {
  const season = seasonFromDay(scenario.day);
  const county = countyFromPoint(lat, lng);

  const countyMul = multipliersForCounty(county);
  const seasonMul = multipliersForSeason(season);

  return {
    county,
    season,
    convergenceKm: BASE.convergenceKm * countyMul.convergence * seasonMul.convergence,
    villageProximityKm: BASE.villageProximityKm * countyMul.village * seasonMul.village,
    farmProximityKm: BASE.farmProximityKm * countyMul.farm * seasonMul.farm,
    resourceScarcityThreshold: Math.min(
      0.7,
      BASE.resourceScarcityThreshold * countyMul.scarcity * seasonMul.scarcity
    ),
    historyThreshold: Math.min(
      0.8,
      BASE.historyThreshold * countyMul.history * seasonMul.history
    ),
  };
}

