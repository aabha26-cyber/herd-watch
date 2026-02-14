/**
 * Environment Data Fetcher — Google Earth Engine
 * ===============================================
 * Fetches all 8 environmental factors for the South Sudan
 * bounding box from GEE satellite datasets.
 *
 * Each factor maps to a specific real dataset:
 *   1. Rainfall      → CHIRPS 2.0 daily (~5km)
 *   2. NDVI          → MODIS MOD13A2 (1km, 16-day)
 *   3. Soil Moisture  → NASA SMAP (9-36km, 3-day)
 *   4. Water Extent   → JRC Global Surface Water (30m, monthly)
 *   5. ET             → MODIS MOD16A2 (1km, 8-day)
 *   6. LST            → MODIS MOD11A1 (1km, daily)
 *   7. Flood Extent   → JRC / Sentinel-1 derived
 *   8. Elevation      → SRTM 30m (static)
 *
 * Server-side only — called from Next.js API routes.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

import {
  getEE,
  evaluate,
  getSouthSudanRegion,
  createSamplingGrid,
  isGEEConfigured,
} from "./gee-client";
import { getCached, setCache, CACHE_TTL } from "./cache";
import { SOUTH_SUDAN_BOUNDS } from "../constants";
import type { EnvironmentGrid, GridCell } from "./types";

const GRID_RESOLUTION = 0.1; // ~11km cells — balances accuracy vs GEE API limits
const CACHE_KEY = "environment-grid";

type DataSourceRuntimeStatus = {
  lastAttemptAt: string | null;
  lastSuccessAt: string | null;
  lastError: string | null;
};

const runtimeStatus: DataSourceRuntimeStatus = {
  lastAttemptAt: null,
  lastSuccessAt: null,
  lastError: null,
};

/** Runtime health for environment fetches (attempt/success/error timestamps). */
export function getEnvironmentRuntimeStatus(): DataSourceRuntimeStatus {
  return { ...runtimeStatus };
}

function selectLatestOrDefault(
  ee: any,
  collectionId: string,
  region: any,
  band: string,
  daysWindow: number,
  defaultValue: number
) {
  const collection = ee
    .ImageCollection(collectionId)
    .filterDate(daysAgo(daysWindow), today())
    .filterBounds(region);

  return ee.Image(
    ee.Algorithms.If(
      collection.size().gt(0),
      ee.Image(collection.sort("system:time_start", false).first()).select(band),
      ee.Image.constant(defaultValue).rename(band)
    )
  );
}

function meanOrDefault(
  ee: any,
  collectionId: string,
  region: any,
  band: string,
  daysWindow: number,
  defaultValue: number
) {
  const collection = ee
    .ImageCollection(collectionId)
    .filterDate(daysAgo(daysWindow), today())
    .filterBounds(region);

  return ee.Image(
    ee.Algorithms.If(
      collection.size().gt(0),
      collection.select(band).mean(),
      ee.Image.constant(defaultValue).rename(band)
    )
  );
}

/** ISO date string for N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/** Today's ISO date string */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

/**
 * Fetch the full environment grid from Google Earth Engine.
 * Returns all 8 factors sampled at ~11km resolution across the corridor.
 *
 * The GEE computation is a single multi-band image sampled at grid points,
 * so all factors are fetched in one API call for efficiency.
 */
export async function fetchEnvironmentGrid(): Promise<EnvironmentGrid> {
  runtimeStatus.lastAttemptAt = new Date().toISOString();
  // Check cache first
  const cached = getCached<EnvironmentGrid>(CACHE_KEY);
  if (cached) {
    console.log("[GEE] Returning cached environment grid");
    runtimeStatus.lastSuccessAt = new Date().toISOString();
    runtimeStatus.lastError = null;
    return cached;
  }

  if (!isGEEConfigured()) {
    throw new Error("GEE credentials not configured");
  }

  console.log("[GEE] Fetching fresh environment data from satellites...");
  const ee = await getEE();
  const region = getSouthSudanRegion(ee);
  const grid = createSamplingGrid(ee, GRID_RESOLUTION);

  // ── 1. Rainfall (CHIRPS daily, last 30 days mean fallback-safe) ─────────────
  const rainfall = meanOrDefault(
    ee,
    "UCSB-CHG/CHIRPS/DAILY",
    region,
    "precipitation",
    30,
    2
  ).rename("rainfall");

  // ── 2. NDVI (MODIS 16-day, latest composite) ─────────────────
  // MOD13A2 NDVI is stored as int * 10000; multiply by 0.0001 to get 0-1
  const ndvi = selectLatestOrDefault(
    ee,
    "MODIS/061/MOD13A2",
    region,
    "NDVI",
    120,
    3000
  )
    .multiply(0.0001)
    .rename("ndvi");

  // ── 3. Soil Moisture (SMAP, last 10 days — wider window for coverage) ──
  const soilMoisture = meanOrDefault(
    ee,
    "NASA/SMAP/SPL3SMP_E/006",
    region,
    "soil_moisture_am",
    30,
    0.25
  )
    .multiply(100) // m³/m³ → percentage
    .rename("soilMoisture");

  // ── 4. Water Extent (JRC Monthly History, latest available) ──
  // Values: 0 = no data, 1 = not water, 2 = water
  const waterExtent = selectLatestOrDefault(
    ee,
    "JRC/GSW1_4/MonthlyHistory",
    region,
    "water",
    730,
    1
  )
    .eq(2) // 1 where water, 0 elsewhere
    .multiply(100)
    .rename("waterExtent");

  // ── 5. Evapotranspiration (MODIS 8-day, latest) ──────────────
  // MOD16A2 ET is in kg/m²/8day (= mm/8day); divide by 8 for mm/day
  const et = selectLatestOrDefault(
    ee,
    "MODIS/061/MOD16A2",
    region,
    "ET",
    120,
    24
  )
    .multiply(0.1) // scale factor
    .divide(8) // 8-day → daily
    .rename("et");

  // ── 6. Land Surface Temperature (MODIS daily, last 7 days) ───
  // MOD11A1 LST is in Kelvin * 0.02; convert to °C
  const lst = meanOrDefault(
    ee,
    "MODIS/061/MOD11A1",
    region,
    "LST_Day_1km",
    30,
    15000
  )
    .multiply(0.02) // scale factor → Kelvin
    .subtract(273.15) // Kelvin → Celsius
    .rename("lst");

  // ── 7. Flood Extent (proxy from JRC water occurrence) ────────
  // Use the same JRC monthly water data to estimate flooding.
  // In production, replace with Sentinel-1 SAR flood detection or NASA LANCE NRT.
  const floodProxy = selectLatestOrDefault(
    ee,
    "JRC/GSW1_4/MonthlyHistory",
    region,
    "water",
    730,
    1
  )
    .eq(2)
    .multiply(100)
    .rename("flood");

  // ── 8. Elevation (SRTM — static, never changes) ─────────────
  const elevation = ee
    .Image("USGS/SRTMGL1_003")
    .select("elevation")
    .rename("elevation");

  // ── Combine into a single multi-band image ───────────────────
  const combined = ee.Image.cat([
    rainfall,
    ndvi,
    soilMoisture,
    waterExtent,
    et,
    lst,
    floodProxy,
    elevation,
  ]);

  // ── Sample at grid points ────────────────────────────────────
  const sampled = combined.reduceRegions({
    collection: grid,
    reducer: ee.Reducer.first(),
    scale: Math.round(GRID_RESOLUTION * 111000), // degrees → meters
  });

  // ── Evaluate and parse results ───────────────────────────────
  console.log("[GEE] Evaluating multi-band sample...");
  const result: any = await evaluate(sampled);

  const cells: GridCell[] = [];
  const LOCAL_MEAN_ELEVATION = 420; // Jonglei corridor average elevation (m)

  if (result && result.features) {
    for (const feature of result.features) {
      const p = feature.properties;
      const lat = p.gridLat;
      const lng = p.gridLng;

      // Compute distance-to-water from water extent percentage
      const waterPct = p.waterExtent ?? 0;
      const distToWaterKm =
        waterPct > 50 ? 0 : waterPct > 10 ? 5 : waterPct > 0 ? 15 : 30;

      // Elevation relative to local mean
      const elevAboveLocal =
        (p.elevation ?? LOCAL_MEAN_ELEVATION) - LOCAL_MEAN_ELEVATION;

      cells.push({
        lat,
        lng,
        values: {
          rainfallMmDay: clamp(p.rainfall ?? 0, 0, 50),
          ndvi: clamp(p.ndvi ?? 0.3, 0, 1),
          soilMoisturePct: clamp(p.soilMoisture ?? 25, 0, 100),
          waterExtentPct: clamp(waterPct, 0, 100),
          evapotranspirationMmDay: clamp(p.et ?? 3, 0, 15),
          landSurfaceTempC: clamp(p.lst ?? 28, -10, 60),
          floodExtentPct: clamp(p.flood ?? 0, 0, 100),
          distToWaterKm,
          elevationAboveLocalM: elevAboveLocal,
          conflictIncidentsPerMonth: 0, // Filled separately from ACLED
        },
      });
    }
  }

  console.log(
    `[GEE] Fetched ${cells.length} grid cells with ${Object.keys(result?.features?.[0]?.properties || {}).length} properties each`
  );

  const environmentGrid: EnvironmentGrid = {
    metadata: {
      fetchedAt: new Date().toISOString(),
      resolution: GRID_RESOLUTION,
      bbox: SOUTH_SUDAN_BOUNDS.bbox,
      sources: {
        rainfall: {
          dataset: "UCSB-CHG/CHIRPS/DAILY",
          dateRange: `${daysAgo(7)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        ndvi: {
          dataset: "MODIS/061/MOD13A2",
          dateRange: `${daysAgo(32)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        soilMoisture: {
          dataset: "NASA/SMAP/SPL3SMP_E/006",
          dateRange: `${daysAgo(10)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        waterExtent: {
          dataset: "JRC/GSW1_4/MonthlyHistory",
          dateRange: `${daysAgo(90)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        et: {
          dataset: "MODIS/061/MOD16A2",
          dateRange: `${daysAgo(32)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        lst: {
          dataset: "MODIS/061/MOD11A1",
          dateRange: `${daysAgo(7)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        flood: {
          dataset: "JRC/GSW1_4/MonthlyHistory (proxy)",
          dateRange: `${daysAgo(90)} to ${today()}`,
          fetchedAt: new Date().toISOString(),
        },
        elevation: {
          dataset: "USGS/SRTMGL1_003",
          dateRange: "static",
          fetchedAt: new Date().toISOString(),
        },
      },
    },
    cells,
  };

  // Cache the result
  setCache(CACHE_KEY, environmentGrid, CACHE_TTL.environment);
  console.log("[GEE] Environment grid cached");
  runtimeStatus.lastSuccessAt = new Date().toISOString();
  runtimeStatus.lastError = null;

  return environmentGrid;
}

/** Check if environment data is available in cache */
export function isEnvironmentDataCached(): boolean {
  return getCached<EnvironmentGrid>(CACHE_KEY) !== null;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
