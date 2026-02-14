/**
 * GET /api/conflicts
 *
 * Fetches conflict event data from ACLED for South Sudan.
 * Returns cached data if fresh, otherwise fetches from ACLED API.
 *
 * Response:
 *   200: ConflictGrid JSON
 *   503: ACLED not configured (system uses hardcoded conflict zones)
 *   500: ACLED fetch error
 */

import { NextResponse } from "next/server";
import {
  fetchConflictData,
  isACLEDConfigured,
} from "@/lib/data/conflict-fetcher";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isACLEDConfigured()) {
    return NextResponse.json(
      {
        error: "ACLED API not configured",
        message:
          "Set ACLED_USERNAME and ACLED_PASSWORD in .env.local to enable real conflict data via OAuth. System will use hardcoded conflict zones.",
        mode: "mock",
      },
      { status: 503 }
    );
  }

  try {
    const data = await fetchConflictData();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Unknown ACLED error";
    console.error("[API/conflicts] Error:", message);
    return NextResponse.json(
      { error: message, mode: "mock" },
      { status: 500 }
    );
  }
}
