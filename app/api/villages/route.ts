/**
 * GET /api/villages
 *
 * Returns village/settlement points from local HDX/OSM GeoJSON when present,
 * with curated fallback data otherwise.
 */

import { NextResponse } from "next/server";
import { fetchVillageData } from "@/lib/data/village-fetcher";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await fetchVillageData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown villages error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

