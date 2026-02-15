"use client";

// #region agent log
if (typeof globalThis !== "undefined") {
  fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "page.tsx:module",
      message: "page module evaluated",
      data: { env: typeof window === "undefined" ? "server" : "client" },
      timestamp: Date.now(),
      hypothesisId: "H2",
    }),
  }).catch(() => {});
}
// #endregion
import { useCallback, useEffect, useMemo, useState } from "react";
import MapView from "@/components/MapView";
import TimeSlider from "@/components/TimeSlider";
import ScenarioPanel from "@/components/ScenarioPanel";
import LayerToggles from "@/components/LayerToggles";
import ExportPanel from "@/components/ExportPanel";
import EthicsDisclaimer from "@/components/EthicsDisclaimer";
import AlertsPanel from "@/components/AlertsPanel";
import SuggestedActionsPanel from "@/components/SuggestedActionsPanel";
import NotifyPanel from "@/components/NotifyPanel";
import DataUploadPanel from "@/components/DataUploadPanel";
import CSIModelPanel from "@/components/CSIModelPanel";
import { simulateHerds, type SimHerd } from "@/lib/movement";
import { detectRisks } from "@/lib/risk";
import { generateEnvironmentGridWithCSI } from "@/lib/envGrid";
import {
  WATER_BODIES,
  VILLAGES,
  CONFLICT_ZONES,
  setVillagesData,
  type Village,
} from "@/lib/environment";
import { PEACEKEEPING_SITES, FARMS } from "@/lib/pois";
import type { ScenarioParams } from "@/lib/heatScore";
import type { UploadedLayer } from "@/lib/dataUpload";
import {
  exportMapPNG,
  exportPDFSummary,
  exportFieldBriefing,
} from "@/lib/export";
import {
  setEnvironmentGrid,
  setConflictGrid,
  getDataMode,
} from "@/lib/data/realFactors";
import type { EnvironmentGrid, ConflictGrid } from "@/lib/data/types";

const FORECAST_DAYS = 7;

const DEFAULT_SCENARIO: ScenarioParams = {
  rainfallAnomaly: 0,
  droughtSeverity: 0,
  floodExtent: 0,
  seasonalShift: 0,
};

export default function Dashboard() {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "page.tsx:Dashboard",
        message: "Dashboard render",
        data: {},
        timestamp: Date.now(),
        hypothesisId: "H2",
      }),
    }).catch(() => {});
  }
  // #endregion
  // ── State ──────────────────────────────────────────────
  const [dayOffset, setDayOffset] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [scenario, setScenario] = useState<ScenarioParams>(DEFAULT_SCENARIO);
  const [uploadedLayers, setUploadedLayers] = useState<UploadedLayer[]>([]);
  const [exporting, setExporting] = useState(false);
  const [dataMode, setDataMode] = useState<
    "real" | "mock" | "mixed" | "loading"
  >("loading");
  const [villages, setVillages] = useState<Village[]>(VILLAGES);

  // ── Load real satellite data on mount ──────────────────
  useEffect(() => {
    let cancelled = false;

    async function loadRealData() {
      // Fetch environment, conflicts, and villages in parallel.
      const [envRes, conflictRes, villageRes] = await Promise.allSettled([
        fetch("/api/environment").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/conflicts").then((r) => (r.ok ? r.json() : null)),
        fetch("/api/villages").then((r) => (r.ok ? r.json() : null)),
      ]);

      if (cancelled) return;

      // Load environment grid if available
      const envData =
        envRes.status === "fulfilled" && envRes.value && !envRes.value.error
          ? (envRes.value as EnvironmentGrid)
          : null;
      if (envData) {
        setEnvironmentGrid(envData);
        console.log(
          `[HerdWatch] Loaded real satellite data: ${envData.cells.length} grid cells from ${Object.keys(envData.metadata.sources).length} sources`,
        );
      }

      // Load conflict grid if available
      const conflictData =
        conflictRes.status === "fulfilled" &&
        conflictRes.value &&
        !conflictRes.value.error
          ? (conflictRes.value as ConflictGrid)
          : null;
      if (conflictData) {
        setConflictGrid(conflictData);
        console.log(
          `[HerdWatch] Loaded real conflict data: ${conflictData.events.length} events`,
        );
      }

      // Load villages from HDX/OSM local GeoJSON when available.
      const villagesPayload =
        villageRes.status === "fulfilled" &&
        villageRes.value &&
        !villageRes.value.error
          ? (villageRes.value as {
              villages: Village[];
              metadata?: { source?: string };
            })
          : null;
      if (villagesPayload?.villages?.length) {
        setVillagesData(villagesPayload.villages);
        setVillages(villagesPayload.villages);
        console.log(
          `[HerdWatch] Loaded villages: ${villagesPayload.villages.length} points (${villagesPayload.metadata?.source ?? "unknown source"})`,
        );
      }

      setDataMode(getDataMode());
    }

    loadRealData().catch((err) => {
      console.warn("[HerdWatch] Real data load failed, using mock data:", err);
      if (!cancelled) setDataMode("mock");
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // Layer toggles
  const [showHerds, setShowHerds] = useState(true);
  const [showTrails, setShowTrails] = useState(true);
  const [showPredictedPaths, setShowPredictedPaths] = useState(true);
  const [showRiskZones, setShowRiskZones] = useState(true);
  const [showAltRoutes, setShowAltRoutes] = useState(true);
  const [showPeacekeeping, setShowPeacekeeping] = useState(true);
  const [showFarms, setShowFarms] = useState(true);
  const [showHeatmap, setShowHeatmap] = useState(true);
  const [showWater, setShowWater] = useState(true);
  const [showVillages, setShowVillages] = useState(false);
  const [showConflictZones, setShowConflictZones] = useState(true);

  // ── Base day (simulated) ──────────────────────────────
  const baseDay = 180; // mid-year (dry→wet transition)

  // ── Simulation ────────────────────────────────────────
  // dataMode included as dependency so herds recompute once real satellite data loads
  const allHerds = useMemo(
    () => simulateHerds(baseDay, FORECAST_DAYS, scenario),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, dataMode],
  );

  // Herds at the selected day offset
  const herdsAtDay: SimHerd[] = useMemo(() => {
    if (dayOffset === 0) return allHerds;
    return allHerds.map((h) => {
      const pred = h.predicted[dayOffset - 1];
      return pred
        ? {
            ...h,
            lat: pred.lat,
            lng: pred.lng,
            confidence: h.confidence * Math.max(0.2, 1 - dayOffset * 0.07),
          }
        : h;
    });
  }, [allHerds, dayOffset]);

  // Risks (always computed from base herds with full predictions)
  const { alerts, riskZones, alternativeRoutes, suggestedActions } = useMemo(
    () => detectRisks(allHerds, baseDay, scenario),
    // allHerds already depends on dataMode transitively, but listing for clarity
    [allHerds, scenario, villages],
  );

  // Environment heatmap (CSI-based: green = high suitability, red = low)
  // dataMode included as dependency so heatmap recomputes once real satellite data loads
  const envCells = useMemo(
    () =>
      generateEnvironmentGridWithCSI(
        { ...scenario, day: baseDay + dayOffset },
        0.3,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [scenario, dayOffset, dataMode],
  );

  // ── Day selection handler (supports -1 sentinel from autoplay) ──
  const handleDaySelect = useCallback((day: number) => {
    if (day === -1) {
      // Autoplay advance: cycle through days
      setDayOffset((d) => (d >= FORECAST_DAYS ? 0 : d + 1));
    } else {
      setDayOffset(day);
    }
  }, []);

  // ── Upload handlers ───────────────────────────────────
  const handleLayerAdd = useCallback((layer: UploadedLayer) => {
    setUploadedLayers((prev) => [...prev, layer]);
  }, []);
  const handleLayerToggle = useCallback((id: string) => {
    setUploadedLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l)),
    );
  }, []);
  const handleLayerRemove = useCallback((id: string) => {
    setUploadedLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ── Export handlers ───────────────────────────────────
  const handleExportPNG = useCallback(async () => {
    setExporting(true);
    try {
      await exportMapPNG(".leaflet-container", "herdwatch-map.png");
    } finally {
      setExporting(false);
    }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const dayLabel =
        dayOffset === 0 ? "Today" : `Day ${dayOffset} prediction`;
      await exportPDFSummary(
        "HerdWatch Simulator – Jonglei–Bor–Sudd Corridor",
        `${dayLabel}. Herds: ${herdsAtDay.length}. Alerts: ${alerts.length}. ` +
          `Scenario: rainfall ${scenario.rainfallAnomaly}, drought ${scenario.droughtSeverity}, flood ${scenario.floodExtent}. ` +
          `Environmental signals only; no GPS or individual tracking.`,
        "herdwatch-summary.pdf",
      );
    } finally {
      setExporting(false);
    }
  }, [dayOffset, herdsAtDay.length, alerts.length, scenario]);

  const handleExportGeoJSON = useCallback(() => {
    const features = herdsAtDay.map((h) => ({
      type: "Feature" as const,
      properties: {
        id: h.id,
        size: h.size,
        confidence: h.confidence,
        speed: h.speedKmDay,
      },
      geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
    }));
    const geojson = {
      type: "FeatureCollection",
      features,
      metadata: {
        description: "HerdWatch Simulator – environmental signals only",
        notFor: "enforcement or military use",
      },
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], {
      type: "application/geo+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "herdwatch-herds.geojson";
    a.click();
    URL.revokeObjectURL(url);
  }, [herdsAtDay]);

  const handleExportFieldBriefing = useCallback(async () => {
    setExporting(true);
    try {
      const dayLabel =
        dayOffset === 0 ? "Today" : `Day ${dayOffset} prediction`;
      await exportFieldBriefing(dayLabel, herdsAtDay, alerts, scenario);
    } finally {
      setExporting(false);
    }
  }, [dayOffset, herdsAtDay, alerts, scenario]);

  // ── Mobile drawer state ──────────────────────────────
  const [leftOpen, setLeftOpen] = useState(false);
  const [rightOpen, setRightOpen] = useState(false);
  const [legendOpen, setLegendOpen] = useState(false); // collapsed by default on all screens
  const [timelineOpen, setTimelineOpen] = useState(true);

  // Lock body scroll when a drawer is open (mobile only)
  useEffect(() => {
    if (leftOpen || rightOpen) {
      document.body.classList.add("drawer-open");
    } else {
      document.body.classList.remove("drawer-open");
    }
    return () => document.body.classList.remove("drawer-open");
  }, [leftOpen, rightOpen]);

  const closeDrawers = useCallback(() => {
    setLeftOpen(false);
    setRightOpen(false);
  }, []);

  // ── Render ────────────────────────────────────────────
  return (
    <div
      className="relative w-full overflow-hidden bg-surface-900"
      style={{ height: "100dvh" }}
    >
      {/* Map — full viewport so Leaflet gets valid dimensions */}
      <div className="absolute inset-0 z-0" aria-hidden="false">
        <MapView
          herds={herdsAtDay}
          showHerds={showHerds}
          showTrails={showTrails}
          showPredictedPaths={showPredictedPaths}
          riskZones={riskZones}
          showRiskZones={showRiskZones}
          peacekeepingSites={PEACEKEEPING_SITES}
          farms={FARMS}
          alternativeRoutes={alternativeRoutes}
          showPeacekeeping={showPeacekeeping}
          showFarms={showFarms}
          showAltRoutes={showAltRoutes}
          environmentCells={envCells}
          showHeatmap={showHeatmap}
          waterBodies={WATER_BODIES}
          showWater={showWater}
          villages={villages}
          showVillages={showVillages}
          conflictZones={CONFLICT_ZONES}
          showConflictZones={showConflictZones}
          uploadedLayers={uploadedLayers}
        />
      </div>

      {/* ── Top bar (responsive) ────────────────────────── */}
      <header className="absolute left-0 right-0 top-0 z-20 border-b border-white/10 bg-surface-800/95 px-3 py-2 backdrop-blur lg:px-4">
        <div className="flex items-center justify-between gap-2">
          {/* Mobile: alerts drawer toggle */}
          <button
            type="button"
            onClick={() => {
              setLeftOpen((o) => !o);
              setRightOpen(false);
            }}
            className="relative flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
            aria-label="Toggle alerts panel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
              />
            </svg>
            {alerts.some((a) => a.riskLevel === "high") && (
              <span className="absolute right-1 top-1 h-2 w-2 animate-pulse rounded-full bg-red-500" />
            )}
          </button>

          <h1 className="min-w-0 truncate text-base font-semibold text-white lg:text-lg">
            HerdWatch
            <span className="ml-2 hidden text-sm font-normal text-gray-400 md:inline">
              · Jonglei–Bor–Sudd Corridor
            </span>
          </h1>

          <div className="flex flex-shrink-0 items-center gap-2 lg:gap-3">
            <a
              href="/spec-map"
              className="hidden rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20 sm:block"
            >
              Spec-only map
            </a>
            <span
              className={`inline-block h-2 w-2 rounded-full ${alerts.some((a) => a.riskLevel === "high") ? "animate-pulse bg-red-500" : alerts.length > 0 ? "bg-amber-500" : "bg-green-500"}`}
            />
            <span className="hidden text-xs text-gray-400 md:inline">
              {alerts.filter((a) => a.riskLevel === "high").length} critical ·{" "}
              {alerts.filter((a) => a.riskLevel === "medium").length} warnings
            </span>
            <span className="hidden text-xs lg:block">
              {dataMode === "loading" ? (
                <span className="text-amber-400">Loading data...</span>
              ) : dataMode === "real" ? (
                <span className="text-emerald-400">Live satellite data</span>
              ) : dataMode === "mixed" ? (
                <span className="text-amber-400">Partial real data</span>
              ) : (
                <span className="text-gray-500">Demo mode — mock data</span>
              )}
            </span>

            {/* Mobile: controls drawer toggle */}
            <button
              type="button"
              onClick={() => {
                setRightOpen((o) => !o);
                setLeftOpen(false);
              }}
              className="relative flex-shrink-0 rounded-lg p-1.5 text-gray-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Toggle controls panel"
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"
                />
              </svg>
            </button>
          </div>
        </div>
      </header>

      {/* ── Mobile backdrop overlay ─────────────────────── */}
      {(leftOpen || rightOpen) && (
        <div
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm backdrop-fade-enter lg:hidden"
          onClick={closeDrawers}
          aria-hidden="true"
        />
      )}

      {/* ── LEFT panel — Alerts & Notifications ─────────── */}
      <aside
        className={`
          fixed left-0 top-0 z-40 flex h-full w-[85vw] max-w-xs flex-col
          border-r border-white/10 bg-surface-800
          transition-transform duration-300 ease-in-out
          ${leftOpen ? "translate-x-0" : "-translate-x-full"}
          lg:absolute lg:top-14 lg:z-10 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:w-72
          lg:max-w-none lg:translate-x-0 lg:bg-surface-800/95 lg:backdrop-blur lg:transition-none
        `}
      >
        {/* Mobile drawer header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <h2 className="text-sm font-semibold text-white">
            Alerts & Notifications
          </h2>
          <button
            type="button"
            onClick={() => setLeftOpen(false)}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close alerts panel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* Scrollable content */}
        <div className="touch-scroll flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-safe">
          <AlertsPanel alerts={alerts} />
          <NotifyPanel alerts={alerts} />
        </div>
      </aside>

      {/* ── RIGHT panel — Actions + Controls ─────────────── */}
      <aside
        className={`
          fixed right-0 top-0 z-40 flex h-full w-[85vw] max-w-xs flex-col
          border-l border-white/10 bg-surface-800
          transition-transform duration-300 ease-in-out
          ${rightOpen ? "translate-x-0" : "translate-x-full"}
          lg:absolute lg:top-14 lg:z-10 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:w-64
          lg:max-w-none lg:translate-x-0 lg:bg-surface-800/95 lg:backdrop-blur lg:transition-none
        `}
      >
        {/* Mobile drawer header */}
        <div className="flex flex-shrink-0 items-center justify-between border-b border-white/10 px-4 py-3 lg:hidden">
          <h2 className="text-sm font-semibold text-white">
            Controls & Layers
          </h2>
          <button
            type="button"
            onClick={() => setRightOpen(false)}
            className="rounded-full p-1 text-gray-400 hover:bg-white/10 hover:text-white"
            aria-label="Close controls panel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
        {/* Scrollable content — static controls first, dynamic results below */}
        <div className="touch-scroll flex flex-1 flex-col gap-4 overflow-y-auto p-4 pb-safe">
          {/* ── Static controls (won't change size while interacting) ── */}
          <LayerToggles
            herds={showHerds}
            trails={showTrails}
            predictedPaths={showPredictedPaths}
            riskZones={showRiskZones}
            peacekeeping={showPeacekeeping}
            farms={showFarms}
            altRoutes={showAltRoutes}
            heatmap={showHeatmap}
            water={showWater}
            villages={showVillages}
            conflictZones={showConflictZones}
            onHerds={setShowHerds}
            onTrails={setShowTrails}
            onPredictedPaths={setShowPredictedPaths}
            onRiskZones={setShowRiskZones}
            onPeacekeeping={setShowPeacekeeping}
            onFarms={setShowFarms}
            onAltRoutes={setShowAltRoutes}
            onHeatmap={setShowHeatmap}
            onWater={setShowWater}
            onVillages={setShowVillages}
            onConflictZones={setShowConflictZones}
          />
          <ScenarioPanel
            scenario={scenario}
            onChange={(p) => setScenario((s) => ({ ...s, ...p }))}
          />
          <DataUploadPanel
            layers={uploadedLayers}
            onLayerAdd={handleLayerAdd}
            onLayerToggle={handleLayerToggle}
            onLayerRemove={handleLayerRemove}
          />
          <ExportPanel
            onExportPNG={handleExportPNG}
            onExportPDF={handleExportPDF}
            onExportGeoJSON={handleExportGeoJSON}
            onExportFieldBriefing={handleExportFieldBriefing}
            exporting={exporting}
          />

          {/* ── Dynamic results (content changes with simulation) ── */}
          <div className="border-t border-white/10 pt-4">
            <CSIModelPanel herds={allHerds} />
          </div>
          <SuggestedActionsPanel actions={suggestedActions} />
          <EthicsDisclaimer />
        </div>
      </aside>

      {/* ── BOTTOM — Timeline slider (responsive) ──────── */}
      <div className="absolute bottom-3 left-3 right-3 z-10 lg:bottom-4 lg:left-80 lg:right-72 lg:mx-4">
        {/* Mobile: toggle bar to show/hide timeline */}
        <button
          type="button"
          onClick={() => setTimelineOpen((o) => !o)}
          className="mb-1 flex w-full items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-surface-800/95 px-3 py-1.5 backdrop-blur transition hover:bg-surface-700/95 lg:hidden"
        >
          <svg
            className={`h-3 w-3 text-gray-400 transition-transform duration-200 ${timelineOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
          <span className="text-[10px] font-medium text-gray-400">
            {timelineOpen
              ? "Hide timeline"
              : `Timeline · ${dayOffset === 0 ? "Now" : `Day ${dayOffset}`}`}
          </span>
          {!timelineOpen && (
            <span
              className={`ml-1 inline-block h-1.5 w-1.5 rounded-full ${
                dayOffset === 0
                  ? "bg-emerald-400"
                  : dayOffset <= 3
                    ? "bg-green-400"
                    : dayOffset <= 5
                      ? "bg-amber-400"
                      : "bg-red-400"
              }`}
            />
          )}
        </button>
        {/* Timeline panel — always visible on desktop, toggleable on mobile */}
        <div
          className={`${timelineOpen ? "block" : "hidden"} rounded-lg border border-white/10 bg-surface-800/95 px-3 py-2 backdrop-blur lg:block lg:px-5 lg:py-3`}
        >
          <TimeSlider
            dayOffset={dayOffset}
            maxDays={FORECAST_DAYS}
            onSelect={handleDaySelect}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying((p) => !p)}
          />
        </div>
      </div>

      {/* ── Legend — collapsible on mobile ───────────────── */}
      <div
        className={`absolute left-3 z-10 lg:bottom-36 lg:left-80 lg:ml-4 ${timelineOpen ? "bottom-[7.5rem]" : "bottom-[3.5rem]"} transition-all duration-200`}
      >
        {/* Toggle button — all screen sizes */}
        <button
          type="button"
          onClick={() => setLegendOpen((o) => !o)}
          className="mb-1 flex items-center gap-1.5 rounded border border-white/10 bg-surface-800/95 px-2 py-1 text-[10px] text-gray-400 backdrop-blur transition hover:bg-surface-700/95 hover:text-gray-300 lg:px-2.5 lg:text-xs"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
            />
          </svg>
          {legendOpen ? "Hide legend" : "Legend"}
          <svg
            className={`h-3 w-3 transition-transform duration-200 ${legendOpen ? "rotate-180" : ""}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
        <div
          className={`${legendOpen ? "block" : "hidden"} rounded border border-white/10 bg-surface-800/95 px-2 py-1.5 backdrop-blur lg:px-3 lg:py-2`}
        >
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-gray-400 lg:text-xs lg:gap-y-1.5">
            <span className="w-full font-medium text-gray-300">Map legend</span>
            <span className="w-full text-[9px] text-emerald-400/90 lg:text-[10px]">
              Heatmap = CSI (8 factors, spec)
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-green-500 lg:h-2.5 lg:w-2.5" />{" "}
              Herd
            </span>
            <span className="flex items-center gap-1">
              <span
                className="block h-0.5 w-3 lg:w-4"
                style={{ borderBottom: "2px dashed #3b82f6" }}
              />{" "}
              Predicted
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2.5 w-2.5 rounded-full border-2 border-red-500 bg-red-500/20 lg:h-3 lg:w-3" />{" "}
              Risk
            </span>
            <span className="flex items-center gap-1">
              <span
                className="block h-0.5 w-3 lg:w-4"
                style={{ borderBottom: "2px dashed #eab308" }}
              />{" "}
              Alt. route
            </span>
            <span className="flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-blue-500 lg:h-2.5 lg:w-2.5" />{" "}
              Peacekeeping
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full bg-sky-400 lg:h-2.5 lg:w-2.5" />{" "}
              Water
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
