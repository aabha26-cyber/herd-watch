"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Rectangle, CircleMarker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { SOUTH_SUDAN_BOUNDS } from "@/lib/constants";

const SATELLITE_TILE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const SATELLITE_ATTRIBUTION = '&copy; <a href="https://www.esri.com/">Esri</a>';

function MapResizeFix() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t = setTimeout(() => map.invalidateSize(), 100);
    return () => clearTimeout(t);
  }, [map]);
  return null;
}

export type SpecAssessmentPoint = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  csi: number;
  band: "high" | "moderate" | "low";
  likelihoodPct: number;
  description: string;
  pathCost: number;
};

type SpecMapInnerProps = {
  center: [number, number];
  zoom: number;
  points: SpecAssessmentPoint[];
};

export default function SpecMapInner({ center, zoom, points }: SpecMapInnerProps) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const dataBounds = useMemo(
    () =>
      L.latLngBounds(
        [SOUTH_SUDAN_BOUNDS.bbox.south, SOUTH_SUDAN_BOUNDS.bbox.west],
        [SOUTH_SUDAN_BOUNDS.bbox.north, SOUTH_SUDAN_BOUNDS.bbox.east]
      ),
    []
  );

  const viewBounds = useMemo(
    () =>
      L.latLngBounds(
        [SOUTH_SUDAN_BOUNDS.viewBbox.south, SOUTH_SUDAN_BOUNDS.viewBbox.west],
        [SOUTH_SUDAN_BOUNDS.viewBbox.north, SOUTH_SUDAN_BOUNDS.viewBbox.east]
      ),
    []
  );

  const mapKey = useRef(
    `spec-map-${typeof window !== "undefined" ? Math.random().toString(36).slice(2) : "ssr"}`
  ).current;

  if (!mounted) {
    return (
      <div
        className="h-full w-full bg-surface-900"
        style={{ height: "100%", minHeight: "60vh" }}
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
      style={{ height: "100%", minHeight: "60vh" }}
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
        pathOptions={{ color: "rgba(255,255,255,0.2)", weight: 1, fill: false }}
      />
      {points.map((p) => (
        <CircleMarker
          key={p.id}
          center={[p.lat, p.lng]}
          radius={10}
          pathOptions={{
            fillColor: p.band === "high" ? "#22c55e" : p.band === "moderate" ? "#eab308" : "#ef4444",
            color: "#0f172a",
            weight: 2,
            fillOpacity: 0.95,
          }}
        >
          <Popup>
            <div className="min-w-[220px] text-left text-sm text-gray-800">
              <div className="font-semibold">{p.label || "Assessment point"}</div>
              <div className="mt-1 text-xs text-gray-600">
                CSI = {p.csi.toFixed(2)} · {p.band} suitability
              </div>
              <div className="mt-1 text-xs">
                Movement likelihood: {Math.round(p.likelihoodPct * 100)}% — {p.description}
              </div>
              <div className="mt-1 text-xs text-gray-500">Path cost (1/CSI + penalties): {p.pathCost.toFixed(2)}</div>
            </div>
          </Popup>
        </CircleMarker>
      ))}
    </MapContainer>
  );
}
