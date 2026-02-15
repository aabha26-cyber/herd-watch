"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { SOUTH_SUDAN_BOUNDS } from "@/lib/constants";
import {
  computeFactorIndices,
  computeCSI,
  getMovementLikelihood,
  getPathCost,
  type FactorValues,
} from "@/lib/csi";
import type { SpecAssessmentPoint } from "@/components/SpecMapInner";

const SpecMapInner = dynamic(() => import("@/components/SpecMapInner"), {
  ssr: false,
  loading: () => (
    <div className="flex h-full min-h-[60vh] w-full items-center justify-center bg-surface-900 text-gray-500">
      Loading map…
    </div>
  ),
});

// Presets from YOUR spec (METRICS_AND_SOURCES.md range table only — no AI-generated values)
const PRESETS: Record<string, FactorValues> = {
  "Dry / low forage": {
    rainfallMmDay: 3,
    ndvi: 0.15,
    soilMoisturePct: 15,
    waterExtentPct: 5,
    evapotranspirationMmDay: 6,
    landSurfaceTempC: 32,
    floodExtentPct: 2,
    distToWaterKm: 22,
    elevationAboveLocalM: 30,
    conflictIncidentsPerMonth: 6,
  },
  "Balanced": {
    rainfallMmDay: 12,
    ndvi: 0.35,
    soilMoisturePct: 30,
    waterExtentPct: 20,
    evapotranspirationMmDay: 3.5,
    landSurfaceTempC: 27,
    floodExtentPct: 3,
    distToWaterKm: 10,
    elevationAboveLocalM: 60,
    conflictIncidentsPerMonth: 0,
  },
  "Wet / flood risk": {
    rainfallMmDay: 22,
    ndvi: 0.55,
    soilMoisturePct: 45,
    waterExtentPct: 35,
    evapotranspirationMmDay: 2,
    landSurfaceTempC: 26,
    floodExtentPct: 15,
    distToWaterKm: 3,
    elevationAboveLocalM: 20,
    conflictIncidentsPerMonth: 2,
  },
};

const DEFAULT_VALUES: FactorValues = PRESETS["Balanced"];

type StoredPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  values: FactorValues;
};

function pointToAssessment(p: StoredPoint): SpecAssessmentPoint {
  const indices = computeFactorIndices(p.values);
  const csi = computeCSI(indices);
  const band = getMovementLikelihood(csi);
  const conflictPenalty =
    p.values.conflictIncidentsPerMonth > 5 ? 1.5 : p.values.conflictIncidentsPerMonth * 0.2;
  const floodPenalty = p.values.floodExtentPct > 10 ? 1.5 : p.values.floodExtentPct / 50;
  const pathCost = getPathCost(csi, { conflictPenalty, floodPenalty });
  return {
    id: p.id,
    lat: p.lat,
    lng: p.lng,
    label: p.label || `Point ${p.id}`,
    csi,
    band: band.band,
    likelihoodPct: band.likelihoodPct,
    description: band.description,
    pathCost,
  };
}

let nextId = 1;
function newId() {
  return `P${nextId++}`;
}

export default function SpecMapPage() {
  const [points, setPoints] = useState<StoredPoint[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<FactorValues>(DEFAULT_VALUES);
  const [draftLabel, setDraftLabel] = useState("");
  const [draftLat, setDraftLat] = useState(SOUTH_SUDAN_BOUNDS.center[0]);
  const [draftLng, setDraftLng] = useState(SOUTH_SUDAN_BOUNDS.center[1]);

  const selectedPoint = useMemo(
    () => points.find((p) => p.id === selectedId),
    [points, selectedId]
  );

  const assessmentPoints: SpecAssessmentPoint[] = useMemo(
    () => points.map(pointToAssessment),
    [points]
  );


  const applyToSelected = useCallback(() => {
    if (!selectedId) return;
    setPoints((prev) =>
      prev.map((p) =>
        p.id === selectedId ? { ...p, label: draftLabel || p.label, values: { ...draft } } : p
      )
    );
  }, [selectedId, draftLabel, draft]);

  const loadPreset = useCallback((name: string) => {
    const v = PRESETS[name];
    if (v) setDraft({ ...v });
  }, []);

  const removePoint = useCallback((id: string) => {
    setPoints((prev) => prev.filter((p) => p.id !== id));
    if (selectedId === id) setSelectedId(null);
  }, [selectedId]);

  const currentLat = selectedPoint ? selectedPoint.lat : draftLat;
  const currentLng = selectedPoint ? selectedPoint.lng : draftLng;
  const setCurrentLat = selectedId
    ? (v: number) =>
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedId ? { ...p, lat: v } : p))
        )
    : setDraftLat;
  const setCurrentLng = selectedId
    ? (v: number) =>
        setPoints((prev) =>
          prev.map((p) => (p.id === selectedId ? { ...p, lng: v } : p))
        )
    : setDraftLng;

  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Lock body scroll when sidebar is open (mobile only)
  useEffect(() => {
    if (sidebarOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
    return () => document.body.classList.remove("drawer-open");
  }, [sidebarOpen]);

  return (
    <div className="relative flex h-screen w-full flex-col bg-surface-900">
      {/* ── Header (responsive) ─────────────────────────── */}
      <header className="z-20 border-b border-white/10 bg-surface-800/95 px-3 py-2 backdrop-blur lg:px-4">
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold text-white lg:text-lg">
              Herd movement model
              <span className="hidden md:inline"> — your spec only</span>
            </h1>
            <p className="hidden text-xs text-gray-400 sm:block">
              Jonglei–Bor–Sudd Corridor. Add points (lat/lng + factor values or presets).
            </p>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <a
              href="/"
              className="shrink-0 rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 lg:px-3 lg:py-1.5 lg:text-sm"
            >
              <span className="hidden sm:inline">← Full simulator</span>
              <span className="sm:hidden">← Back</span>
            </a>
            {/* Mobile: toggle sidebar */}
            <button
              type="button"
              onClick={() => setSidebarOpen((o) => !o)}
              className="rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Toggle point editor"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="relative flex flex-1 overflow-hidden">
        {/* Map */}
        <div className="flex-1" style={{ minHeight: "60vh" }}>
          <SpecMapInner
            center={SOUTH_SUDAN_BOUNDS.center}
            zoom={SOUTH_SUDAN_BOUNDS.zoom}
            points={assessmentPoints}
          />
        </div>

        {/* ── Mobile backdrop ───────────────────────────── */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm backdrop-fade-enter lg:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        {/* ── Sidebar — slide-in drawer on mobile, fixed on desktop ── */}
        <aside
          className={`
            fixed right-0 top-0 z-40 flex h-full w-[85vw] max-w-sm flex-col
            border-l border-white/10 bg-surface-800
            transition-transform duration-300 ease-in-out
            ${sidebarOpen ? "translate-x-0" : "translate-x-full"}
            lg:relative lg:z-auto lg:h-auto lg:w-80 lg:max-w-none
            lg:translate-x-0 lg:bg-surface-800/95 lg:transition-none
          `}
        >
          {/* Mobile drawer header */}
          <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
            <h2 className="text-sm font-semibold text-white">Point Editor</h2>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
              aria-label="Close panel"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="touch-scroll flex flex-1 flex-col gap-3 overflow-y-auto p-4 pb-safe">
            <div className="space-y-2">
              <h2 className="text-sm font-medium text-white">Presets (from your spec)</h2>
              <div className="flex flex-wrap gap-2">
                {Object.keys(PRESETS).map((name) => (
                  <button
                    key={name}
                    type="button"
                    onClick={() => loadPreset(name)}
                    className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-sm font-medium text-white">Add or edit point</h2>
              <p className="text-xs text-gray-400">
                Enter lat/lng and factor values (from your data), or load a preset and adjust.
              </p>
              <label className="block text-xs text-gray-400">
                Label
                <input
                  type="text"
                  value={selectedPoint ? draftLabel : draftLabel || "New point"}
                  onChange={(e) => setDraftLabel(e.target.value)}
                  placeholder="e.g. Camp A"
                  className="mt-0.5 w-full rounded border border-white/20 bg-surface-900 px-2 py-1 text-white"
                />
              </label>
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs">
                <label className="text-gray-400">
                  Lat
                  <input
                    type="number"
                    step="any"
                    value={currentLat}
                    onChange={(e) => setCurrentLat(Number(e.target.value))}
                    className="mt-0.5 w-full rounded border border-white/20 bg-surface-900 px-2 py-1 text-white"
                  />
                </label>
                <label className="text-gray-400">
                  Lng
                  <input
                    type="number"
                    step="any"
                    value={currentLng}
                    onChange={(e) => setCurrentLng(Number(e.target.value))}
                    className="mt-0.5 w-full rounded border border-white/20 bg-surface-900 px-2 py-1 text-white"
                  />
                </label>
              </div>
              <p className="text-xs text-gray-500">Factor values (your spec ranges)</p>
              {[
                { k: "rainfallMmDay", label: "Rainfall mm/day", min: 0, max: 30, step: 0.5 },
                { k: "ndvi", label: "NDVI 0–1", min: 0, max: 1, step: 0.05 },
                { k: "soilMoisturePct", label: "Soil moisture %", min: 0, max: 100, step: 1 },
                { k: "waterExtentPct", label: "Water extent %", min: 0, max: 100, step: 1 },
                { k: "evapotranspirationMmDay", label: "ET mm/day", min: 0, max: 10, step: 0.5 },
                { k: "landSurfaceTempC", label: "LST °C", min: 20, max: 40, step: 1 },
                { k: "floodExtentPct", label: "Flood %", min: 0, max: 100, step: 1 },
                { k: "distToWaterKm", label: "Dist to water km", min: 0, max: 50, step: 1 },
                { k: "elevationAboveLocalM", label: "Elev above local m", min: -50, max: 150, step: 5 },
                { k: "conflictIncidentsPerMonth", label: "Conflict / month", min: 0, max: 15, step: 1 },
              ].map(({ k, label, min, max, step }) => (
                <label key={k} className="block text-xs text-gray-400">
                  {label}
                  <input
                    type="number"
                    min={min}
                    max={max}
                    step={step}
                    value={draft[k as keyof FactorValues] as number}
                    onChange={(e) =>
                      setDraft((v) => ({ ...v, [k]: Number(e.target.value) }))
                    }
                    className="mt-0.5 w-full rounded border border-white/20 bg-surface-900 px-2 py-1 text-white"
                  />
                </label>
              ))}
              <div className="flex flex-wrap gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    const id = newId();
                    setPoints((prev) => [
                      ...prev,
                      {
                        id,
                        lat: currentLat,
                        lng: currentLng,
                        label: draftLabel || `Point ${id}`,
                        values: { ...draft },
                      },
                    ]);
                    setSelectedId(id);
                  }}
                  className="rounded bg-emerald-600 px-3 py-1.5 text-sm text-white hover:bg-emerald-500"
                >
                  Add point
                </button>
                {selectedId && (
                  <>
                    <button
                      type="button"
                      onClick={applyToSelected}
                      className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500"
                    >
                      Apply to selected
                    </button>
                    <button
                      type="button"
                      onClick={() => selectedId && removePoint(selectedId)}
                      className="rounded bg-red-600/80 px-3 py-1.5 text-sm text-white hover:bg-red-500"
                    >
                      Remove
                    </button>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-1 border-t border-white/10 pt-3">
              <h2 className="text-sm font-medium text-white">Points</h2>
              {points.length === 0 ? (
                <p className="text-xs text-gray-500">No points yet. Use presets and &quot;Add point&quot;.</p>
              ) : (
                <ul className="space-y-1 text-xs">
                  {points.map((p) => {
                    const a = pointToAssessment(p);
                    return (
                      <li
                        key={p.id}
                        className={`cursor-pointer rounded px-2 py-1 ${
                          selectedId === p.id ? "bg-white/20" : "hover:bg-white/10"
                        }`}
                        onClick={() => {
                          setSelectedId(p.id);
                          setDraft(p.values);
                          setDraftLabel(p.label);
                        }}
                      >
                        {p.label} — CSI {a.csi.toFixed(2)} ({a.band})
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
