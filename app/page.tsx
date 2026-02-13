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
import { WATER_BODIES, VILLAGES, CONFLICT_ZONES } from "@/lib/environment";
import { PEACEKEEPING_SITES, FARMS } from "@/lib/pois";
import type { ScenarioParams } from "@/lib/heatScore";
import type { UploadedLayer } from "@/lib/dataUpload";
import { exportMapPNG, exportPDFSummary, exportFieldBriefing } from "@/lib/export";

const FORECAST_DAYS = 4;

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
  const allHerds = useMemo(
    () => simulateHerds(baseDay, FORECAST_DAYS, scenario),
    [scenario]
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
            confidence: h.confidence * (1 - dayOffset * 0.08),
          }
        : h;
    });
  }, [allHerds, dayOffset]);

  // Risks (always computed from base herds with full predictions)
  const { alerts, riskZones, alternativeRoutes, suggestedActions } = useMemo(
    () => detectRisks(allHerds, baseDay, scenario),
    [allHerds, scenario]
  );

  // Environment heatmap (CSI-based: green = high suitability, red = low)
  const envCells = useMemo(
    () => generateEnvironmentGridWithCSI({ ...scenario, day: baseDay + dayOffset }, 0.3),
    [scenario, dayOffset]
  );

  // ── Playback ──────────────────────────────────────────
  useEffect(() => {
    if (!isPlaying) return;
    const id = setInterval(() => {
      setDayOffset((d) => (d >= FORECAST_DAYS ? 0 : d + 1));
    }, 1200);
    return () => clearInterval(id);
  }, [isPlaying]);

  // ── Upload handlers ───────────────────────────────────
  const handleLayerAdd = useCallback((layer: UploadedLayer) => {
    setUploadedLayers((prev) => [...prev, layer]);
  }, []);
  const handleLayerToggle = useCallback((id: string) => {
    setUploadedLayers((prev) =>
      prev.map((l) => (l.id === id ? { ...l, visible: !l.visible } : l))
    );
  }, []);
  const handleLayerRemove = useCallback((id: string) => {
    setUploadedLayers((prev) => prev.filter((l) => l.id !== id));
  }, []);

  // ── Export handlers ───────────────────────────────────
  const handleExportPNG = useCallback(async () => {
    setExporting(true);
    try { await exportMapPNG(".leaflet-container", "herdwatch-map.png"); }
    finally { setExporting(false); }
  }, []);

  const handleExportPDF = useCallback(async () => {
    setExporting(true);
    try {
      const dayLabel = dayOffset === 0 ? "Today" : `Day ${dayOffset} prediction`;
      await exportPDFSummary(
        "HerdWatch Simulator – Jonglei–Bor–Sudd Corridor",
        `${dayLabel}. Herds: ${herdsAtDay.length}. Alerts: ${alerts.length}. ` +
        `Scenario: rainfall ${scenario.rainfallAnomaly}, drought ${scenario.droughtSeverity}, flood ${scenario.floodExtent}. ` +
        `Environmental signals only; no GPS or individual tracking.`,
        "herdwatch-summary.pdf"
      );
    } finally { setExporting(false); }
  }, [dayOffset, herdsAtDay.length, alerts.length, scenario]);

  const handleExportGeoJSON = useCallback(() => {
    const features = herdsAtDay.map((h) => ({
      type: "Feature" as const,
      properties: { id: h.id, size: h.size, confidence: h.confidence, speed: h.speedKmDay },
      geometry: { type: "Point" as const, coordinates: [h.lng, h.lat] },
    }));
    const geojson = {
      type: "FeatureCollection",
      features,
      metadata: { description: "HerdWatch Simulator – environmental signals only", notFor: "enforcement or military use" },
    };
    const blob = new Blob([JSON.stringify(geojson, null, 2)], { type: "application/geo+json" });
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
      const dayLabel = dayOffset === 0 ? "Today" : `Day ${dayOffset} prediction`;
      await exportFieldBriefing(dayLabel, herdsAtDay, alerts, scenario);
    } finally { setExporting(false); }
  }, [dayOffset, herdsAtDay, alerts, scenario]);

  // ── Render ────────────────────────────────────────────
  return (
    <div className="relative h-screen w-full overflow-hidden bg-surface-900" style={{ minHeight: "100vh", height: "100vh" }}>
      {/* Map — full viewport so Leaflet gets valid dimensions */}
      <div className="absolute inset-0 z-0" style={{ width: "100%", height: "100%", minHeight: "100vh" }} aria-hidden="false">
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
        villages={VILLAGES}
        showVillages={showVillages}
        conflictZones={CONFLICT_ZONES}
        showConflictZones={showConflictZones}
        uploadedLayers={uploadedLayers}
        />
      </div>

      {/* Top bar */}
      <header className="absolute left-0 right-0 top-0 z-10 border-b border-white/10 bg-surface-800/95 px-4 py-2 backdrop-blur">
        <div className="flex items-center justify-between">
          <h1 className="text-lg font-semibold text-white">
            HerdWatch
            <span className="ml-2 text-sm font-normal text-gray-400">· Jonglei–Bor–Sudd Corridor</span>
          </h1>
          <div className="flex items-center gap-3">
            <a
              href="/spec-map"
              className="rounded bg-white/10 px-2 py-1 text-xs text-white hover:bg-white/20"
            >
              Spec-only map
            </a>
            <span className={`inline-block h-2 w-2 rounded-full ${alerts.some((a) => a.riskLevel === "high") ? "animate-pulse bg-red-500" : alerts.length > 0 ? "bg-amber-500" : "bg-green-500"}`} />
            <span className="text-xs text-gray-400">
              {alerts.filter((a) => a.riskLevel === "high").length} critical ·{" "}
              {alerts.filter((a) => a.riskLevel === "medium").length} warnings
            </span>
            <span className="hidden text-xs text-gray-500 sm:block">
              Feasibility demo — not a live system
            </span>
          </div>
        </div>
      </header>

      {/* LEFT panel — Alerts */}
      <aside className="absolute left-0 top-14 z-10 flex max-h-[calc(100vh-8rem)] w-72 flex-col gap-4 overflow-y-auto border-r border-white/10 bg-surface-800/95 p-4 backdrop-blur">
        <AlertsPanel alerts={alerts} />
        <NotifyPanel alerts={alerts} />
      </aside>

      {/* RIGHT panel — Actions + Controls */}
      <aside className="absolute right-0 top-14 z-10 flex max-h-[calc(100vh-8rem)] w-64 flex-col gap-4 overflow-y-auto border-l border-white/10 bg-surface-800/95 p-4 backdrop-blur">
        <SuggestedActionsPanel actions={suggestedActions} />
        <CSIModelPanel herds={allHerds} />
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
        <ScenarioPanel scenario={scenario} onChange={(p) => setScenario((s) => ({ ...s, ...p }))} />
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
        <EthicsDisclaimer />
      </aside>

      {/* BOTTOM — Timeline slider */}
      <div className="absolute bottom-4 left-80 right-72 z-10 mx-4">
        <div className="rounded-lg border border-white/10 bg-surface-800/95 px-5 py-3 backdrop-blur">
          <TimeSlider
            dayOffset={dayOffset}
            maxDays={FORECAST_DAYS}
            onSelect={setDayOffset}
            isPlaying={isPlaying}
            onPlayPause={() => setIsPlaying((p) => !p)}
          />
        </div>
      </div>

      {/* Legend — bottom left above timeline */}
      <div className="absolute bottom-24 left-80 z-10 ml-4 rounded border border-white/10 bg-surface-800/95 px-3 py-2 backdrop-blur">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-400">
          <span className="w-full font-medium text-gray-300">Map legend</span>
          <span className="w-full text-[10px] text-emerald-400/90">Heatmap = CSI (8 factors, spec)</span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Herd
          </span>
          <span className="flex items-center gap-1">
            <span className="block h-0.5 w-4 bg-blue-500" style={{ borderBottom: "2px dashed #3b82f6" }} /> Predicted
          </span>
          <span className="flex items-center gap-1">
            <span className="h-3 w-3 rounded-full border-2 border-red-500 bg-red-500/20" /> Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="block h-0.5 w-4" style={{ borderBottom: "2px dashed #eab308" }} /> Alt. route
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2.5 w-2.5 rounded-full bg-blue-500" /> Peacekeeping
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" /> Water
          </span>
        </div>
      </div>
    </div>
  );
}
