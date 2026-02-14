"use client";

import "leaflet/dist/leaflet.css";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  useMap,
  Rectangle,
  Circle,
  CircleMarker,
  Marker,
  Polygon,
  Polyline,
  Tooltip,
  GeoJSON as GeoJSONLayer,
} from "react-leaflet";
import L from "leaflet";
import { SOUTH_SUDAN_BOUNDS } from "@/lib/constants";
import type { SimHerd } from "@/lib/movement";
import type { RiskZone, AlternativeRoute } from "@/lib/risk";
import type { PeacekeepingSite, Farm } from "@/lib/pois";
import type { EnvironmentCell } from "@/lib/environment";
import type { UploadedLayer } from "@/lib/dataUpload";
import type { WaterBody, Village, ConflictZone } from "@/lib/environment";

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

const SATELLITE_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a>';

// ── Vegetation + Water Heatmap ──────────────────────────

function HeatmapLayer({
  cells,
  show,
}: {
  cells: EnvironmentCell[];
  show: boolean;
}) {
  if (!show || cells.length === 0) return null;

  return (
    <>
      {cells.map((cell, i) => {
        const v = cell.vegetation;
        const w = cell.water;
        // Green = good grazing, brown = scarce, blue tint = water
        const r = Math.round((1 - v) * 180 + w * 20);
        const g = Math.round(v * 180 + w * 40);
        const b = Math.round(w * 120);
        const color = `rgb(${r},${g},${b})`;
        return (
          <Rectangle
            key={`hm-${i}`}
            bounds={[
              [cell.lat - 0.125, cell.lng - 0.125],
              [cell.lat + 0.125, cell.lng + 0.125],
            ]}
            pathOptions={{
              fillColor: color,
              color: "transparent",
              weight: 0,
              fillOpacity: 0.25,
            }}
          />
        );
      })}
    </>
  );
}

// ── Cattle icon (Google Maps–style: top-down, like car icons) ────────
const CATTLE_ICON_SIZE = 40;
// Top-down cattle silhouette: body oval + head circle — clean like GM vehicle icons
const CATTLE_SVG = (size: number) => {
  const fill = "#22c55e";
  const stroke = "#15803d";
  const sw = Math.max(1, size / 14);
  return `<svg width="${size}" height="${size}" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" style="display:block;">
  <ellipse cx="16" cy="18" rx="10" ry="8" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
  <circle cx="16" cy="8" r="5" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>
</svg>`;
};

function getCattleIcon(herdSize: number): L.DivIcon {
  const scale = 0.85 + herdSize * 0.35;
  const s = Math.round(CATTLE_ICON_SIZE * scale);
  return L.divIcon({
    className: "cattle-marker",
    iconSize: [s, s],
    iconAnchor: [s / 2, s / 2],
    html: `<div style="width:${s}px;height:${s}px;display:flex;align-items:center;justify-content:center;pointer-events:auto;filter:drop-shadow(0 1px 2px rgba(0,0,0,0.5));">${CATTLE_SVG(s)}</div>`,
  });
}

// ── Herd Markers (Cattle icons, like cars on Google Maps) ────────────

function HerdsLayer({ herds, show }: { herds: SimHerd[]; show: boolean }) {
  if (!show || herds.length === 0) return null;

  return (
    <>
      {herds.map((herd) => (
        <Marker
          key={herd.id}
          position={[herd.lat, herd.lng]}
          icon={getCattleIcon(herd.size)}
          zIndexOffset={500}
        >
          <Tooltip permanent={false} direction="top">
            <div>
              <span className="font-semibold text-gray-900">{herd.id}</span>
              <br />
              <span className="text-xs text-gray-600">
                Speed: ~{herd.speedKmDay} km/day
              </span>
              <br />
              <span className="text-xs text-gray-600">
                Confidence: {(herd.confidence * 100).toFixed(0)}%
              </span>
              <br />
              <span className="text-xs text-gray-500 italic">
                {herd.decisionReason}
              </span>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

// ── Predicted Paths (Blue arrows) ────────────────────────

function PredictedPathsLayer({
  herds,
  show,
}: {
  herds: SimHerd[];
  show: boolean;
}) {
  if (!show) return null;

  return (
    <>
      {herds
        .filter((h) => h.predicted.length > 0)
        .map((herd) => {
          const positions: [number, number][] = [
            [herd.lat, herd.lng],
            ...herd.predicted.map((p) => [p.lat, p.lng] as [number, number]),
          ];
          return (
            <Fragment key={`pred-${herd.id}`}>
              <Polyline
                positions={positions}
                pathOptions={{
                  color: "#3b82f6",
                  weight: 3,
                  opacity: 0.8,
                  dashArray: "6 4",
                }}
              >
                <Tooltip permanent={false} direction="top">
                  <span className="text-xs text-gray-700">
                    {herd.id} predicted path (4-day)
                  </span>
                </Tooltip>
              </Polyline>
              {/* Arrow head at the last predicted point */}
              {herd.predicted.length > 0 && (
                <CircleMarker
                  center={[
                    herd.predicted[herd.predicted.length - 1].lat,
                    herd.predicted[herd.predicted.length - 1].lng,
                  ]}
                  radius={4}
                  pathOptions={{
                    fillColor: "#3b82f6",
                    color: "#1d4ed8",
                    weight: 2,
                    fillOpacity: 0.9,
                  }}
                />
              )}
            </Fragment>
          );
        })}
    </>
  );
}

// ── Movement Trails (past) ───────────────────────────────

function TrailsLayer({
  herds,
  show,
}: {
  herds: SimHerd[];
  show: boolean;
}) {
  if (!show) return null;

  return (
    <>
      {herds
        .filter((h) => h.trail.length > 1)
        .map((herd) => (
          <Polyline
            key={`trail-${herd.id}`}
            positions={herd.trail.map((t) => [t.lat, t.lng] as [number, number])}
            pathOptions={{
              color: "#4ade80",
              weight: 2,
              opacity: 0.5,
              dashArray: "4 4",
            }}
          />
        ))}
    </>
  );
}

// ── Risk Zones (Red shaded areas) ────────────────────────

function RiskZonesLayer({
  riskZones,
  show,
}: {
  riskZones: RiskZone[];
  show: boolean;
}) {
  if (!show || riskZones.length === 0) return null;

  return (
    <>
      {riskZones.map((zone) => {
        const color =
          zone.riskLevel === "high"
            ? "#ef4444"
            : zone.riskLevel === "medium"
            ? "#f59e0b"
            : "#22c55e";
        return (
          <Circle
            key={zone.alertId}
            center={[zone.lat, zone.lng]}
            radius={zone.radiusKm * 1000}
            pathOptions={{
              fillColor: color,
              color,
              weight: 2,
              fillOpacity: 0.2,
              opacity: 0.8,
            }}
          >
            <Tooltip permanent={false} direction="top">
              <span className="text-xs font-semibold" style={{ color }}>
                {zone.riskLevel.toUpperCase()} RISK
              </span>
            </Tooltip>
          </Circle>
        );
      })}
    </>
  );
}

// ── Alternative Routes (Yellow dashed) ───────────────────

function AlternativeRoutesLayer({
  routes,
  show,
}: {
  routes: AlternativeRoute[];
  show: boolean;
}) {
  if (!show || routes.length === 0) return null;

  return (
    <>
      {routes.map((r, i) => (
        <Polyline
          key={`alt-${r.herdId}-${i}`}
          positions={[
            [r.fromLat, r.fromLng],
            [r.toLat, r.toLng],
          ]}
          pathOptions={{
            color: "#eab308",
            weight: 4,
            opacity: 0.9,
            dashArray: "10 8",
          }}
        >
          <Tooltip permanent={false} direction="top">
            <span className="text-xs text-gray-700">{r.label}</span>
          </Tooltip>
        </Polyline>
      ))}
    </>
  );
}

// ── Peacekeeping Sites ───────────────────────────────────

function PeacekeepingLayer({
  sites,
  show,
}: {
  sites: PeacekeepingSite[];
  show: boolean;
}) {
  if (!show || sites.length === 0) return null;

  return (
    <>
      {sites.map((site) => (
        <CircleMarker
          key={site.id}
          center={[site.lat, site.lng]}
          radius={10}
          pathOptions={{
            fillColor: "#2563eb",
            color: "#1d4ed8",
            weight: 2,
            fillOpacity: 0.9,
            opacity: 1,
          }}
        >
          <Tooltip permanent={false} direction="top">
            <span className="font-semibold text-gray-900">{site.name}</span>
            <br />
            <span className="text-xs capitalize">{site.type ?? "site"}</span>
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

// ── Farms ────────────────────────────────────────────────

function FarmsLayer({ farms, show }: { farms: Farm[]; show: boolean }) {
  if (!show || farms.length === 0) return null;

  return (
    <>
      {farms.map((farm) => (
        <Polygon
          key={farm.id}
          positions={farm.bounds}
          pathOptions={{
            fillColor: "#d97706",
            color: "#b45309",
            weight: 1.5,
            fillOpacity: 0.35,
            opacity: 0.9,
          }}
        >
          <Tooltip permanent={false} direction="top">
            <span className="font-medium text-gray-900">{farm.name}</span>
          </Tooltip>
        </Polygon>
      ))}
    </>
  );
}

// ── Water Bodies ─────────────────────────────────────────

function WaterBodiesLayer({
  waterBodies,
  show,
}: {
  waterBodies: WaterBody[];
  show: boolean;
}) {
  if (!show || waterBodies.length === 0) return null;

  return (
    <>
      {waterBodies.map((wb) => {
        const color =
          wb.type === "river"
            ? "#38bdf8"
            : wb.type === "lake"
            ? "#0ea5e9"
            : wb.type === "wetland"
            ? "#67e8f9"
            : "#7dd3fc";
        const radius = wb.type === "lake" || wb.type === "wetland" ? 8 : 5;
        return (
          <CircleMarker
            key={wb.id}
            center={[wb.lat, wb.lng]}
            radius={radius}
            pathOptions={{
              fillColor: color,
              color: "#0284c7",
              weight: 1,
              fillOpacity: 0.7,
            }}
          >
            <Tooltip permanent={false} direction="top">
              <span className="text-xs text-gray-700">{wb.name}</span>
              <br />
              <span className="text-[10px] capitalize text-gray-500">{wb.type}</span>
            </Tooltip>
          </CircleMarker>
        );
      })}
    </>
  );
}

// ── Villages ─────────────────────────────────────────────

function VillagesLayer({
  villages,
  show,
}: {
  villages: Village[];
  show: boolean;
}) {
  if (!show || villages.length === 0) return null;

  return (
    <>
      {villages.map((v) => (
        <CircleMarker
          key={v.id}
          center={[v.lat, v.lng]}
          radius={3 + (v.population ? Math.min(v.population / 80000, 5) : 1)}
          pathOptions={{
            fillColor: "#f8fafc",
            color: "#94a3b8",
            weight: 1,
            fillOpacity: 0.6,
          }}
        >
          <Tooltip permanent={false} direction="top">
            <span className="text-xs font-medium text-gray-900">{v.name}</span>
            {v.population && (
              <>
                <br />
                <span className="text-[10px] text-gray-500">Pop: {v.population.toLocaleString()}</span>
              </>
            )}
          </Tooltip>
        </CircleMarker>
      ))}
    </>
  );
}

// ── Conflict Zones (historical) ──────────────────────────

function ConflictZonesLayer({
  zones,
  show,
}: {
  zones: ConflictZone[];
  show: boolean;
}) {
  if (!show || zones.length === 0) return null;

  return (
    <>
      {zones.map((cz) => (
        <Circle
          key={cz.id}
          center={[cz.lat, cz.lng]}
          radius={cz.radiusKm * 1000}
          pathOptions={{
            fillColor:
              cz.severity === "high"
                ? "#991b1b"
                : cz.severity === "medium"
                ? "#92400e"
                : "#78716c",
            color: "transparent",
            weight: 0,
            fillOpacity: 0.12,
          }}
        >
          <Tooltip permanent={false} direction="top">
            <span className="text-xs text-gray-700">{cz.name}</span>
            <br />
            <span className="text-[10px] capitalize text-gray-500">
              {cz.severity} conflict history
            </span>
          </Tooltip>
        </Circle>
      ))}
    </>
  );
}

// ── Uploaded Data Layers ─────────────────────────────────

function UploadedDataLayers({ layers }: { layers: UploadedLayer[] }) {
  return (
    <>
      {layers
        .filter((l) => l.visible)
        .map((layer) => (
          <GeoJSONLayer
            key={layer.id}
            data={layer.geojson}
            style={() => ({
              color: layer.color,
              weight: 2,
              fillColor: layer.color,
              fillOpacity: 0.4,
            })}
            pointToLayer={(_, latlng) =>
              L.circleMarker(latlng, {
                radius: 6,
                fillColor: layer.color,
                color: layer.color,
                weight: 1,
                fillOpacity: 0.8,
              })
            }
            onEachFeature={(feature, leafletLayer) => {
              if (feature.properties) {
                const entries = Object.entries(feature.properties)
                  .slice(0, 6)
                  .map(([k, v]) => `<b>${k}:</b> ${v}`)
                  .join("<br/>");
                leafletLayer.bindTooltip(entries);
              }
            }}
          />
        ))}
    </>
  );
}

// ── Main MapInner component ──────────────────────────────

export type MapInnerProps = {
  center: [number, number];
  zoom: number;
  herds: SimHerd[];
  showHerds: boolean;
  showTrails: boolean;
  showPredictedPaths: boolean;
  riskZones: RiskZone[];
  showRiskZones: boolean;
  peacekeepingSites: PeacekeepingSite[];
  farms: Farm[];
  alternativeRoutes: AlternativeRoute[];
  showPeacekeeping: boolean;
  showFarms: boolean;
  showAltRoutes: boolean;
  environmentCells: EnvironmentCell[];
  showHeatmap: boolean;
  waterBodies: WaterBody[];
  showWater: boolean;
  villages: Village[];
  showVillages: boolean;
  conflictZones: ConflictZone[];
  showConflictZones: boolean;
  uploadedLayers: UploadedLayer[];
};

export default function MapInner({
  center,
  zoom,
  herds,
  showHerds,
  showTrails,
  showPredictedPaths,
  riskZones,
  showRiskZones,
  peacekeepingSites,
  farms,
  alternativeRoutes,
  showPeacekeeping,
  showFarms,
  showAltRoutes,
  environmentCells,
  showHeatmap,
  waterBodies,
  showWater,
  villages,
  showVillages,
  conflictZones,
  showConflictZones,
  uploadedLayers,
}: MapInnerProps) {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "MapInner.tsx:MapInner",
        message: "MapInner component ran",
        data: { herdCount: herds?.length },
        timestamp: Date.now(),
        hypothesisId: "H4",
      }),
    }).catch(() => {});
  }
  // #endregion
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
    // #region agent log
    if (typeof window !== "undefined") {
      fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location: "MapInner.tsx:useEffect:mounted",
          message: "MapInner mounted",
          data: {},
          timestamp: Date.now(),
          hypothesisId: "H4",
        }),
      }).catch(() => {});
    }
    // #endregion
  }, []);

  // Data-area rectangle (for the outline overlay)
  const dataBounds = useMemo(
    () =>
      L.latLngBounds(
        [SOUTH_SUDAN_BOUNDS.bbox.south, SOUTH_SUDAN_BOUNDS.bbox.west],
        [SOUTH_SUDAN_BOUNDS.bbox.north, SOUTH_SUDAN_BOUNDS.bbox.east]
      ),
    []
  );

  // Wider pan/zoom bounds so edge herds are fully visible
  const viewBounds = useMemo(
    () =>
      L.latLngBounds(
        [SOUTH_SUDAN_BOUNDS.viewBbox.south, SOUTH_SUDAN_BOUNDS.viewBbox.west],
        [SOUTH_SUDAN_BOUNDS.viewBbox.north, SOUTH_SUDAN_BOUNDS.viewBbox.east]
      ),
    []
  );

  const mapKey = useRef(
    `map-${typeof window !== "undefined" ? Math.random().toString(36).slice(2) : "ssr"}`
  ).current;

  if (!mounted) {
    return (
      <div
        className="h-full w-full bg-surface-900"
        style={{ height: "100%", minHeight: "100vh" }}
        aria-hidden
      />
    );
  }

  return (
    <MapContainer
      key={mapKey}
      center={center}
      zoom={zoom}
      className="h-full w-full bg-surface-900"
      style={{ height: "100%", minHeight: "100vh" }}
      zoomControl={true}
      minZoom={6}
      maxZoom={13}
      maxBounds={viewBounds}
      maxBoundsViscosity={0.8}
    >
      <MapResizeFix />
      <TileLayer url={SATELLITE_TILE} attribution={SATELLITE_ATTRIBUTION} />
      <Rectangle
        bounds={dataBounds}
        pathOptions={{ color: "rgba(255,255,255,0.15)", weight: 1, fill: false }}
      />

      {/* Layer order: heatmap (bottom) → static → dynamic → herds (top) */}
      <HeatmapLayer cells={environmentCells} show={showHeatmap} />
      <ConflictZonesLayer zones={conflictZones} show={showConflictZones} />
      <FarmsLayer farms={farms} show={showFarms} />
      <WaterBodiesLayer waterBodies={waterBodies} show={showWater} />
      <VillagesLayer villages={villages} show={showVillages} />
      <PeacekeepingLayer sites={peacekeepingSites} show={showPeacekeeping} />
      <UploadedDataLayers layers={uploadedLayers} />
      <RiskZonesLayer riskZones={riskZones} show={showRiskZones} />
      <AlternativeRoutesLayer routes={alternativeRoutes} show={showAltRoutes} />
      <TrailsLayer herds={herds} show={showTrails} />
      <PredictedPathsLayer herds={herds} show={showPredictedPaths} />
      <HerdsLayer herds={herds} show={showHerds} />
    </MapContainer>
  );
}
