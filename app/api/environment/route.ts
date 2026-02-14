/**
 * GET /api/environment
 *
 * Fetches the full environment grid (all 8 factors) from Google Earth Engine.
 * Returns cached data if fresh, otherwise fetches from satellites.
 *
 * Response:
 *   200: EnvironmentGrid JSON
 *   503: GEE not configured (system runs in mock mode)
 *   500: GEE fetch error
 */

import { NextResponse } from "next/server";
import { fetchEnvironmentGrid } from "@/lib/data/environment-fetcher";
import { isGEEConfigured } from "@/lib/data/gee-client";

export const dynamic = "force-dynamic";
export const maxDuration = 60; // GEE computations can take 30-60s

export async function GET() {
  if (!isGEEConfigured()) {
    return NextResponse.json(
      {
        error: "GEE not configured",
        message:
          "Set GEE_SERVICE_ACCOUNT_KEY and GEE_PROJECT_ID in .env.local to enable real satellite data. System will use mock data.",
        mode: "mock",
      },
      { status: 503 }
    );
  }

  try {
    const grid = await fetchEnvironmentGrid();
    return NextResponse.json(grid);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown GEE error";
    console.error("[API/environment] Error:", message);
    return NextResponse.json(
      { error: message, mode: "mock" },
      { status: 500 }
    );
  }
}
