# /context — Project Context Hub

> Single place for all project documentation, plans, and reference material.

---

## Files in This Folder

| File | Purpose |
|------|---------|
| **[PROJECT_OVERVIEW.md](./PROJECT_OVERVIEW.md)** | What HerdWatch is, stakeholder insights (Jorge/UN), system architecture, satellite strategy, ethical guardrails. Summarized from the [Challenge Google Doc](https://docs.google.com/document/d/16_OARu_1rYhPtOWthDDmxgK_7IzoxxZXkROG5rCg7bs/edit). |
| **[CODEBASE_STRUCTURE.md](./CODEBASE_STRUCTURE.md)** | Full directory tree, what's built, what's mock, what needs implementation. Tech stack, architectural decisions. |
| **[DATA_INTEGRATION_PLAN.md](./DATA_INTEGRATION_PLAN.md)** | Step-by-step plan to replace mock data with real satellite/API sources. GEE integration approach, sprint breakdown, quick wins. |
| **[METRICS_AND_SOURCES.md](./METRICS_AND_SOURCES.md)** | Single source of truth for the CSI model: factor rankings, numerical ranges, normalized indices, formulas. Copied from `docs/`. |
| **[PROGRESS_LOG.md](./PROGRESS_LOG.md)** | Milestone status, what was built, research catalog (17 datasets), key findings. Consolidated from `agents/AGENT_LOG.md`. |
| **[IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)** | Current implementation snapshot: what is live, what is partially live, known blockers, and next actions. |

---

## Other Documentation Locations (Originals)

These files still exist at their original locations for backward compatibility:

- `docs/METRICS_AND_SOURCES.md` — Original CSI model spec (canonical copy now in this folder)
- `agents/AGENT_LOG.md` — Auto-generated agent log (progress consolidated here)
- `public/docs/METRICS_AND_SOURCES.md` — Static copy served to browser
- `README.md` (root) — Quick-start readme

---

## Quick Reference

**Current branch:** `connect-real-data`

**What's done:** M1 + M2 complete, M3 partially implemented (real GEE + partial ACLED)

**What's next:** Resolve ACLED access and finish remaining M3 items — see [IMPLEMENTATION_STATUS.md](./IMPLEMENTATION_STATUS.md)

**Key data sources needed:**
- Google Earth Engine (Sentinel, MODIS, CHIRPS, SMAP, SRTM)
- ACLED API (conflict events)
- HDX downloads (villages, rivers, roads)
- ONS UNET model (cattle camp detection from Sentinel-2)
