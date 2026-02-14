/**
 * Village Data Fetcher
 * ====================
 * Loads South Sudan village/settlement points from local HDX/OSM GeoJSON
 * when available, with fallback to curated in-repo villages.
 */

import { promises as fs } from "fs";
import path from "path";
import { SOUTH_SUDAN_BOUNDS } from "../constants";
import { VILLAGES, type Village } from "../environment";

type GeoJSONFeature = {
  type: string;
  properties?: Record<string, unknown>;
  geometry?: {
    type?: string;
    coordinates?: unknown;
  };
};

type VillagesResponse = {
  metadata: {
    fetchedAt: string;
    source: "hdx-osm" | "fallback";
    count: number;
  };
  villages: Village[];
};

const VILLAGES_PATH = path.join(
  process.cwd(),
  "public",
  "data",
  "south-sudan-villages.geojson"
);

function inCorridor(lat: number, lng: number): boolean {
  const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.viewBbox;
  return lat >= south && lat <= north && lng >= west && lng <= east;
}

function nameFromProps(props: Record<string, unknown>, idx: number): string {
  const candidates = [
    props.name,
    props.NAME,
    props.name_en,
    props.place_name,
    props.local_name,
  ];
  for (const c of candidates) {
    if (typeof c === "string" && c.trim()) return c.trim();
  }
  return `Settlement ${idx + 1}`;
}

function villageFromFeature(feature: GeoJSONFeature, idx: number): Village | null {
  if (feature.geometry?.type !== "Point") return null;
  const coords = feature.geometry.coordinates;
  if (!Array.isArray(coords) || coords.length < 2) return null;
  const lng = Number(coords[0]);
  const lat = Number(coords[1]);
  if (!Number.isFinite(lat) || !Number.isFinite(lng) || !inCorridor(lat, lng)) {
    return null;
  }
  const props = feature.properties ?? {};
  const name = nameFromProps(props, idx);
  const populationRaw = props.population ?? props.pop ?? props.POPULATION;
  const population =
    typeof populationRaw === "number"
      ? populationRaw
      : typeof populationRaw === "string"
      ? Number(populationRaw)
      : undefined;

  return {
    id: `real-v-${idx + 1}`,
    name,
    lat,
    lng,
    population: Number.isFinite(population) ? population : undefined,
  };
}

export async function fetchVillageData(): Promise<VillagesResponse> {
  try {
    const raw = await fs.readFile(VILLAGES_PATH, "utf8");
    const parsed = JSON.parse(raw) as { features?: GeoJSONFeature[] };
    const features = Array.isArray(parsed.features) ? parsed.features : [];

    const villages = features
      .map((f, idx) => villageFromFeature(f, idx))
      .filter((v): v is Village => v !== null);

    // Keep list manageable and stable for UI/risk calculations.
    const trimmed = villages.slice(0, 400);
    if (trimmed.length > 0) {
      return {
        metadata: {
          fetchedAt: new Date().toISOString(),
          source: "hdx-osm",
          count: trimmed.length,
        },
        villages: trimmed,
      };
    }
  } catch {
    // fall through to fallback
  }

  return {
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: "fallback",
      count: VILLAGES.length,
    },
    villages: VILLAGES,
  };
}

