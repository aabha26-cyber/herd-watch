"use client";

// #region agent log
if (typeof globalThis !== "undefined") {
  fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      location: "MapView.tsx:module",
      message: "MapView module evaluated",
      data: { env: typeof window === "undefined" ? "server" : "client" },
      timestamp: Date.now(),
      hypothesisId: "H3",
    }),
  }).catch(() => {});
}
// #endregion
import dynamic from "next/dynamic";
import { SOUTH_SUDAN_BOUNDS } from "@/lib/constants";
import type { MapInnerProps } from "./MapInner";

const MapInner = dynamic(() => import("./MapInner"), {
  ssr: false,
  loading: () => (
    <div
      className="flex h-full w-full items-center justify-center bg-surface-900 text-gray-500"
      style={{ height: "100%", minHeight: "100vh" }}
    >
      Loading map…
    </div>
  ),
});

export default function MapView(props: Omit<MapInnerProps, "center" | "zoom">) {
  // #region agent log
  if (typeof window !== "undefined") {
    fetch("http://127.0.0.1:7245/ingest/dacdc356-df59-402d-bb7c-df96680bea95", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        location: "MapView.tsx:MapView",
        message: "MapView render",
        data: { herdCount: props.herds?.length },
        timestamp: Date.now(),
        hypothesisId: "H3",
      }),
    }).catch(() => {});
  }
  // #endregion
  return (
    <div className="h-full w-full" style={{ height: "100%", minHeight: "100vh", width: "100%" }}>
      <MapInner
        center={SOUTH_SUDAN_BOUNDS.center}
        zoom={SOUTH_SUDAN_BOUNDS.zoom}
        {...props}
      />
    </div>
  );
}
