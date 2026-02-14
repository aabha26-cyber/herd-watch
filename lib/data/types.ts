/**
 * Shared types for the real data layer.
 */

import type { FactorValues } from "../csi";

// ── Environment Grid ──────────────────────────────────────

/** A single cell in the pre-fetched environment grid */
export type GridCell = {
  lat: number;
  lng: number;
  values: FactorValues;
};

/** The full environment grid, pre-fetched and cached */
export type EnvironmentGrid = {
  metadata: {
    fetchedAt: string;
    resolution: number;
    bbox: { south: number; north: number; west: number; east: number };
    sources: Record<
      string,
      { dataset: string; dateRange: string; fetchedAt: string }
    >;
  };
  cells: GridCell[];
};

// ── Conflict Data ─────────────────────────────────────────

/** A single conflict event from ACLED */
export type ConflictEvent = {
  lat: number;
  lng: number;
  date: string;
  eventType: string;
  fatalities: number;
  notes?: string;
};

/** Aggregated conflict data for the corridor */
export type ConflictGrid = {
  metadata: {
    fetchedAt: string;
    source: string;
    dateRange: string;
  };
  events: ConflictEvent[];
  /** Aggregated incidents per grid cell per month */
  cellAggregates: Array<{
    lat: number;
    lng: number;
    incidentsPerMonth: number;
  }>;
};

// ── Status / Cache ────────────────────────────────────────

/** Data freshness status for the /api/status endpoint */
export type DataStatus = {
  geeConfigured: boolean;
  acledConfigured: boolean;
  cache: Record<
    string,
    { fetchedAt: string; expiresAt: string; isFresh: boolean }
  >;
  dataSources: Record<string, { dataset: string; refreshRate: string }>;
};

/** Cache entry with TTL metadata */
export type CacheEntry<T> = {
  data: T;
  fetchedAt: number;
  expiresAt: number;
};
