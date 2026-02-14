/**
 * Conflict Data Fetcher — ACLED API
 * ==================================
 * Fetches conflict event data from ACLED for South Sudan and
 * aggregates it to grid cells for the CSI model.
 *
 * ACLED (Armed Conflict Location & Event Data) provides point-level
 * data on political violence and protest events worldwide.
 *
 * Server-side only — called from Next.js API routes.
 */

import { getCached, setCache, CACHE_TTL } from "./cache";
import { SOUTH_SUDAN_BOUNDS } from "../constants";
import type { ConflictGrid, ConflictEvent } from "./types";

const CACHE_KEY = "conflict-grid";
const ACLED_BASE_URL = "https://acleddata.com/api/acled/read";
const ACLED_TOKEN_URL = "https://acleddata.com/oauth/token";

type ACLEDTokenResponse = {
  token_type: string;
  expires_in: number;
  access_token: string;
  refresh_token?: string;
};

let tokenCache:
  | {
      accessToken: string;
      refreshToken?: string;
      expiresAt: number;
    }
  | null = null;

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

/** Check if ACLED API credentials are configured */
export function isACLEDConfigured(): boolean {
  return !!(process.env.ACLED_USERNAME && process.env.ACLED_PASSWORD);
}

/** Runtime health for ACLED calls (attempt/success/error timestamps). */
export function getACLEDRuntimeStatus(): DataSourceRuntimeStatus {
  return { ...runtimeStatus };
}

/** Check if conflict data is already available in cache. */
export function isConflictDataCached(): boolean {
  return getCached<ConflictGrid>(CACHE_KEY) !== null;
}

async function requestAccessToken(): Promise<string> {
  const body = new URLSearchParams({
    username: process.env.ACLED_USERNAME!,
    password: process.env.ACLED_PASSWORD!,
    grant_type: "password",
    client_id: "acled",
  });

  const response = await fetch(ACLED_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `ACLED token request failed: ${response.status} ${response.statusText}`
    );
  }

  const tokenData = (await response.json()) as ACLEDTokenResponse;
  tokenCache = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    // subtract 60s safety buffer
    expiresAt: Date.now() + tokenData.expires_in * 1000 - 60_000,
  };

  return tokenData.access_token;
}

async function refreshAccessToken(refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    refresh_token: refreshToken,
    grant_type: "refresh_token",
    client_id: "acled",
  });

  const response = await fetch(ACLED_TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  if (!response.ok) {
    throw new Error(
      `ACLED token refresh failed: ${response.status} ${response.statusText}`
    );
  }

  const tokenData = (await response.json()) as ACLEDTokenResponse;
  tokenCache = {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? refreshToken,
    expiresAt: Date.now() + tokenData.expires_in * 1000 - 60_000,
  };

  return tokenData.access_token;
}

async function getACLEDToken(): Promise<string> {
  if (tokenCache && Date.now() < tokenCache.expiresAt) {
    return tokenCache.accessToken;
  }

  if (tokenCache?.refreshToken) {
    try {
      return await refreshAccessToken(tokenCache.refreshToken);
    } catch {
      // fall back to password grant below
    }
  }

  return requestAccessToken();
}

/**
 * Fetch conflict events from ACLED for South Sudan (last 6 months).
 * Returns raw events and per-grid-cell monthly aggregates.
 */
export async function fetchConflictData(): Promise<ConflictGrid> {
  runtimeStatus.lastAttemptAt = new Date().toISOString();
  // Check cache first
  const cached = getCached<ConflictGrid>(CACHE_KEY);
  if (cached) {
    console.log("[ACLED] Returning cached conflict data");
    runtimeStatus.lastSuccessAt = new Date().toISOString();
    runtimeStatus.lastError = null;
    return cached;
  }

  if (!isACLEDConfigured()) {
    throw new Error(
      "ACLED API not configured. Set ACLED_USERNAME and ACLED_PASSWORD in .env.local"
    );
  }

  console.log("[ACLED] Fetching conflict events for South Sudan...");

  const endDate = new Date();
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 6);

  const { south, north, west, east } = SOUTH_SUDAN_BOUNDS.bbox;

  const token = await getACLEDToken();
  const params = new URLSearchParams({
    _format: "json",
    country: "South Sudan",
    event_date: `${isoDate(startDate)}|${isoDate(endDate)}`,
    event_date_where: "BETWEEN",
    latitude: `${south}|${north}`,
    latitude_where: "BETWEEN",
    longitude: `${west}|${east}`,
    longitude_where: "BETWEEN",
    limit: "5000",
  });

  const response = await fetch(`${ACLED_BASE_URL}?${params.toString()}`, {
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });
  if (!response.ok) {
    const body = await response.text().catch(() => "");
    runtimeStatus.lastError = `HTTP ${response.status} ${response.statusText}${body ? ` | ${body.slice(0, 300)}` : ""}`;
    throw new Error(
      `ACLED API error: ${response.status} ${response.statusText}${body ? ` | ${body.slice(0, 300)}` : ""}`
    );
  }

  const data = await response.json();
  if (typeof data?.status === "number" && data.status !== 200) {
    throw new Error(`ACLED API response status=${data.status}`);
  }

  // Parse events
  const events: ConflictEvent[] = (data.data || []).map(
    (e: Record<string, string>) => ({
      lat: parseFloat(e.latitude),
      lng: parseFloat(e.longitude),
      date: e.event_date,
      eventType: e.event_type,
      fatalities: parseInt(e.fatalities) || 0,
      notes: e.notes,
    })
  );

  // Aggregate to grid cells: count incidents per 0.1° cell per month
  const MONTHS_IN_RANGE = 6;
  const cellMap = new Map<string, number>();

  for (const event of events) {
    const gridLat = Math.round(event.lat * 10) / 10;
    const gridLng = Math.round(event.lng * 10) / 10;
    const key = `${gridLat},${gridLng}`;
    cellMap.set(key, (cellMap.get(key) || 0) + 1);
  }

  const cellAggregates = Array.from(cellMap.entries()).map(([key, count]) => {
    const [lat, lng] = key.split(",").map(Number);
    return {
      lat,
      lng,
      incidentsPerMonth: Math.round((count / MONTHS_IN_RANGE) * 10) / 10,
    };
  });

  console.log(
    `[ACLED] Fetched ${events.length} events, aggregated to ${cellAggregates.length} grid cells`
  );

  const conflictGrid: ConflictGrid = {
    metadata: {
      fetchedAt: new Date().toISOString(),
      source: "ACLED",
      dateRange: `${isoDate(startDate)} to ${isoDate(endDate)}`,
    },
    events,
    cellAggregates,
  };

  // Cache the result
  setCache(CACHE_KEY, conflictGrid, CACHE_TTL.conflicts);
  console.log("[ACLED] Conflict data cached");
  runtimeStatus.lastSuccessAt = new Date().toISOString();
  runtimeStatus.lastError = null;

  return conflictGrid;
}

function isoDate(d: Date): string {
  return d.toISOString().split("T")[0];
}
