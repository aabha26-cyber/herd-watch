# HerdWatch — Implementation Status (2026-02-14)

> Current snapshot of what has been implemented on branch `connect-real-data`.

---

## What Changed Since Initial Docs

The project is no longer mock-only. A real-data integration layer now exists and is wired into the dashboard, with graceful fallback to mock data when external services fail.

---

## Implemented

### 1) Real Environment Data Pipeline (Google Earth Engine)

- Added server-side GEE client and auth flow:
  - `lib/data/gee-client.ts`
- Added environment fetcher for 8 factors:
  - `lib/data/environment-fetcher.ts`
- Added safe fallbacks for empty image collections (no-band errors avoided).
- Added API route:
  - `app/api/environment/route.ts`
- Added in-memory TTL caching:
  - `lib/data/cache.ts`

### 2) Real Conflict Data Pipeline (ACLED OAuth)

- Added ACLED OAuth password + refresh token flow:
  - `lib/data/conflict-fetcher.ts`
- Added conflict API route:
  - `app/api/conflicts/route.ts`
- Added ACLED config + source visibility in status endpoint:
  - `app/api/status/route.ts`

### 3) Runtime Data-Mode Integration in App

- Added real-factor adapter with fallback behavior:
  - `lib/data/realFactors.ts`
- Switched movement engine to use real-factor adapter:
  - `lib/movement.ts`
- Wired page bootstrap to fetch real env/conflict data on load:
  - `app/page.tsx`
- Added UI mode indicator:
  - Live satellite data / Partial real data / Demo mode.

### 4) Documentation and Setup Improvements

- Added consolidated context folder and docs index:
  - `context/`
- Added `.env.example` for required credentials.
- Updated `.gitignore` to avoid committing local secrets.
- Added custom declaration for Earth Engine package typing:
  - `lib/data/earthengine.d.ts`

---

## Current Data Reality

- **Environment factors (GEE):** Working with real satellite-derived values.
- **Conflict factors (ACLED):** Integration code is correct, but account-level authorization is still returning access denial in live tests.
- **Overall app mode:** Usually `mixed` right now (real environment + mock conflict fallback).

---

## Known Blockers

### ACLED Access Denied

- Token issuance can succeed, but read endpoint can still return denied/forbidden depending on ACLED account entitlements.
- This is currently the main blocker for full real-data mode.

---

## Remaining Work

1. Resolve ACLED account authorization for API read access.
2. Replace static `lib/environment.ts` layers (water/villages/conflicts) with HDX-backed datasets.
3. Add cattle camp detection pipeline (ONS UNET adaptation).
4. Add production hardening (auth, persistence, feedback loop, offline strategy).

---

## Quick Verification Commands

Use these routes while `npm run dev` is running:

- `GET /api/environment` -> confirms real GEE grid output
- `GET /api/conflicts` -> confirms ACLED conflict ingestion status
- `GET /api/status` -> confirms `mock` / `mixed` / `real` mode and source availability

---

*Last updated: 2026-02-14.*
