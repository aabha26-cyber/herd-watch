"use client";

import type { SimHerd } from "@/lib/movement";
import { FACTOR_RANKS, getMovementLikelihood } from "@/lib/csi";

type CSIModelPanelProps = {
  herds: SimHerd[];
};

export default function CSIModelPanel({ herds }: CSIModelPanelProps) {
  const withCsi = herds.filter((h) => h.csi != null);
  const avgCsi =
    withCsi.length > 0
      ? withCsi.reduce((s, h) => s + (h.csi ?? 0), 0) / withCsi.length
      : 0.5;
  const bandCounts = { high: 0, moderate: 0, low: 0 };
  withCsi.forEach((h) => {
    const b = h.movementBand ?? getMovementLikelihood(h.csi ?? 0).band;
    bandCounts[b]++;
  });

  return (
    <div className="space-y-3 rounded-lg border border-emerald-900/50 bg-emerald-950/20 p-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
        CSI Movement Model
      </h3>
      <p className="text-[11px] text-gray-400 leading-relaxed">
        Composite Suitability Index (8 factors, weighted by rank).{" "}
        <a
          href="/docs/METRICS_AND_SOURCES.md"
          target="_blank"
          rel="noopener noreferrer"
          className="text-emerald-400 hover:underline"
        >
          Load spec (METRICS_AND_SOURCES.md)
        </a>
      </p>

      <div className="grid grid-cols-3 gap-1.5 text-center">
        <div className="rounded bg-surface-800/80 px-2 py-1.5">
          <div className="text-lg font-bold text-emerald-400">{bandCounts.high}</div>
          <div className="text-[9px] uppercase text-gray-500">High CSI (stay)</div>
        </div>
        <div className="rounded bg-surface-800/80 px-2 py-1.5">
          <div className="text-lg font-bold text-amber-400">{bandCounts.moderate}</div>
          <div className="text-[9px] uppercase text-gray-500">Moderate (&lt;20 km)</div>
        </div>
        <div className="rounded bg-surface-800/80 px-2 py-1.5">
          <div className="text-lg font-bold text-red-400">{bandCounts.low}</div>
          <div className="text-[9px] uppercase text-gray-500">Low (50–400 km)</div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 rounded bg-surface-800/60 px-2 py-1.5">
        <span className="text-[10px] text-gray-500">Avg CSI</span>
        <span className="font-mono text-sm font-semibold text-emerald-300">
          {avgCsi.toFixed(2)}
        </span>
      </div>

      <ul className="space-y-0.5 text-[10px] text-gray-500">
        {Object.entries(FACTOR_RANKS).map(([key, rank]) => (
          <li key={key} className="flex justify-between">
            <span className="capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</span>
            <span className="font-mono text-gray-400">×{rank / 10}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
