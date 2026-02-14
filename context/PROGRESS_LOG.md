# HerdWatch — Progress Log

> Consolidated progress snapshot reflecting current implementation work on `connect-real-data`.

---

## Milestone Status

| Milestone | Status | Notes |
|-----------|--------|-------|
| **M1 — Simulator Core Engine** | 100% Complete | CSI, movement, risk detection, baseline environment layers, notifications, uploads |
| **M2 — Dashboard UI** | 100% Complete | Full interactive map workflow, timeline, scenario controls, export panels |
| **M3 — Real Data Integration** | In Progress (Partial) | Real GEE environment data is integrated; ACLED integration implemented but currently blocked by API authorization/access |
| **M4 — Cattle Camp Detection** | Not Started | ONS UNET adaptation still pending |
| **M5 — Production Deployment** | Not Started | Auth, persistence, offline, feedback loop not yet implemented |

---

## Completed in This Phase

### Backend/API foundation added

- Added Next.js API routes:
  - `app/api/environment/route.ts`
  - `app/api/conflicts/route.ts`
  - `app/api/status/route.ts`
- Added in-memory cache utilities:
  - `lib/data/cache.ts`

### Google Earth Engine integration added

- Added server-side GEE client:
  - `lib/data/gee-client.ts`
- Added environmental factor fetcher for 8 factors:
  - `lib/data/environment-fetcher.ts`
- Added empty-collection fallback handling to prevent GEE "no bands" runtime failures.

### ACLED integration added

- Reworked ACLED flow to OAuth (password + refresh grant):
  - `lib/data/conflict-fetcher.ts`
- Added clearer error responses when ACLED read endpoint denies access.

### App wiring updated

- Added real-data adapter:
  - `lib/data/realFactors.ts`
- Updated movement layer to use real-data adapter:
  - `lib/movement.ts`
- Updated dashboard bootstrap to load `/api/environment` and `/api/conflicts` and expose live mode label:
  - `app/page.tsx`

---

## Current Behavior

- **Environment data:** Real satellite-derived values load successfully from GEE.
- **Conflict data:** ACLED code path is implemented, but live authorization remains blocked by account/API access response.
- **Mode shown in app:** Commonly `mixed` until ACLED access is resolved.

---

## Key Issues Resolved

1. TypeScript map iteration issue in cache layer.
2. Missing declaration issue for `@google/earthengine`.
3. Next.js config warning around invalid config key.
4. GEE no-band failures from empty collections.

---

## Active Blocker

- **ACLED API access denied / forbidden** during live calls despite integration updates.
- Remaining work is mostly account authorization + endpoint entitlement confirmation, not app architecture changes.

---

## Next Actions

1. Finalize ACLED API access so `/api/conflicts` returns real event data.
2. Replace static `lib/environment.ts` map overlays with HDX/real geospatial sources.
3. Start cattle camp detection pipeline (ONS UNET workflow).
4. Add persistence and operational hardening for production usage.

---

*Last updated: 2026-02-14.*
