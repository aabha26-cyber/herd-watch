/**
 * TTL Cache — In-memory with per-key expiration
 * ==============================================
 * Used to cache satellite and API data. Each data type has a
 * different refresh cadence matching its satellite revisit time.
 */

import type { CacheEntry } from "./types";

const memoryCache = new Map<string, CacheEntry<unknown>>();

/** Cache TTL presets in milliseconds */
export const CACHE_TTL = {
  rainfall: 24 * 60 * 60 * 1000, // 24h   (CHIRPS daily)
  ndvi: 7 * 24 * 60 * 60 * 1000, // 7d    (MODIS 16-day composite)
  soilMoisture: 2 * 24 * 60 * 60 * 1000, // 2d    (SMAP 3-day)
  waterExtent: 14 * 24 * 60 * 60 * 1000, // 14d   (JRC monthly)
  et: 5 * 24 * 60 * 60 * 1000, // 5d    (MODIS 8-day)
  lst: 24 * 60 * 60 * 1000, // 24h   (MODIS daily)
  flood: 12 * 60 * 60 * 1000, // 12h   (NRT flood)
  elevation: Infinity, // static (SRTM never changes)
  conflicts: 24 * 60 * 60 * 1000, // 24h   (ACLED weekly)
  environment: 12 * 60 * 60 * 1000, // 12h   (full grid refresh)
} as const;

/** Get a cached value if it exists and is still fresh */
export function getCached<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    memoryCache.delete(key);
    return null;
  }
  return entry.data as T;
}

/** Store a value in cache with a TTL in milliseconds */
export function setCache<T>(key: string, data: T, ttlMs: number): void {
  const now = Date.now();
  memoryCache.set(key, {
    data,
    fetchedAt: now,
    expiresAt: ttlMs === Infinity ? Infinity : now + ttlMs,
  });
}

/** Get metadata about all cache entries (for /api/status) */
export function getCacheStatus(): Record<
  string,
  { fetchedAt: string; expiresAt: string; isFresh: boolean }
> {
  const status: Record<
    string,
    { fetchedAt: string; expiresAt: string; isFresh: boolean }
  > = {};
  memoryCache.forEach((entry, key) => {
    status[key] = {
      fetchedAt: new Date(entry.fetchedAt).toISOString(),
      expiresAt:
        entry.expiresAt === Infinity
          ? "never"
          : new Date(entry.expiresAt).toISOString(),
      isFresh: Date.now() < entry.expiresAt,
    };
  });
  return status;
}

/** Clear all cache entries */
export function clearCache(): void {
  memoryCache.clear();
}
