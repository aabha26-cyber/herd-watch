/**
 * GET /api/status
 *
 * Returns the current data configuration and cache status.
 * Useful for debugging and showing data freshness in the UI.
 */

import { NextResponse } from "next/server";
import { getCacheStatus } from "@/lib/data/cache";
import { isGEEConfigured } from "@/lib/data/gee-client";
import {
  getACLEDRuntimeStatus,
  isConflictDataCached,
  isACLEDConfigured,
} from "@/lib/data/conflict-fetcher";
import {
  getEnvironmentRuntimeStatus,
  isEnvironmentDataCached,
} from "@/lib/data/environment-fetcher";

export const dynamic = "force-dynamic";

export async function GET() {
  const geeConfigured = isGEEConfigured();
  const acledConfigured = isACLEDConfigured();
  const envRuntime = getEnvironmentRuntimeStatus();
  const acledRuntime = getACLEDRuntimeStatus();

  // Route modules can be isolated in runtime, so cache-backed health is the reliable signal.
  const geeHealthy = isEnvironmentDataCached();
  const acledHealthy = isConflictDataCached();

  const configuredMode = geeConfigured && acledConfigured ? "real" : geeConfigured || acledConfigured ? "mixed" : "mock";
  const runtimeMode = geeHealthy && acledHealthy ? "real" : geeHealthy || acledHealthy ? "mixed" : "mock";

  return NextResponse.json({
    // Backward-compatible field (configured by env vars, not guaranteed runtime success).
    mode: configuredMode,
    configuredMode,
    runtimeMode,
    geeConfigured,
    acledConfigured,
    runtime: {
      gee: {
        healthy: geeHealthy,
        ...envRuntime,
      },
      acled: {
        healthy: acledHealthy,
        ...acledRuntime,
      },
    },
    cache: getCacheStatus(),
    dataSources: {
      rainfall: {
        dataset: "UCSB-CHG/CHIRPS/DAILY",
        provider: "UCSB Climate Hazards Group",
        resolution: "~5km",
        refreshRate: "24h",
        available: geeConfigured,
      },
      ndvi: {
        dataset: "MODIS/061/MOD13A2",
        provider: "NASA",
        resolution: "1km",
        refreshRate: "7 days (16-day composite)",
        available: geeConfigured,
      },
      soilMoisture: {
        dataset: "NASA/SMAP/SPL3SMP_E/006",
        provider: "NASA",
        resolution: "9-36km",
        refreshRate: "2 days",
        available: geeConfigured,
      },
      waterExtent: {
        dataset: "JRC/GSW1_4/MonthlyHistory",
        provider: "EC Joint Research Centre",
        resolution: "30m",
        refreshRate: "14 days",
        available: geeConfigured,
      },
      evapotranspiration: {
        dataset: "MODIS/061/MOD16A2",
        provider: "NASA",
        resolution: "1km",
        refreshRate: "5 days (8-day composite)",
        available: geeConfigured,
      },
      landSurfaceTemp: {
        dataset: "MODIS/061/MOD11A1",
        provider: "NASA",
        resolution: "1km",
        refreshRate: "24h",
        available: geeConfigured,
      },
      floodExtent: {
        dataset: "JRC/GSW1_4/MonthlyHistory (proxy)",
        provider: "EC JRC / NASA LANCE",
        resolution: "250m-30m",
        refreshRate: "12h",
        available: geeConfigured,
      },
      elevation: {
        dataset: "USGS/SRTMGL1_003",
        provider: "NASA/USGS",
        resolution: "30m",
        refreshRate: "static (never changes)",
        available: geeConfigured,
      },
      conflicts: {
        dataset: "ACLED",
        provider: "Armed Conflict Location & Event Data",
        resolution: "point events",
        refreshRate: "24h",
        available: acledConfigured,
      },
      villages: {
        dataset: "HDX/OSM populated places (local GeoJSON fallback supported)",
        provider: "HDX / OSM",
        resolution: "point features",
        refreshRate: "manual refresh (download-hdx-data.sh)",
        available: true,
      },
    },
    instructions: {
      gee: geeConfigured
        ? "GEE is configured and ready."
        : "To enable real satellite data, set GEE_SERVICE_ACCOUNT_KEY and GEE_PROJECT_ID in .env.local. See .env.example for setup steps.",
      acled: acledConfigured
        ? "ACLED is configured and ready."
        : "To enable real conflict data, register at https://developer.acleddata.com/ and set ACLED_USERNAME and ACLED_PASSWORD in .env.local.",
      runtime:
        "Use runtimeMode and runtime.*.healthy to verify live connectivity. configuredMode only confirms env vars are present.",
    },
  });
}
