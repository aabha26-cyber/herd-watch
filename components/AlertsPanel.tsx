"use client";

import type { Alert } from "@/lib/risk";

type AlertsPanelProps = {
  alerts: Alert[];
};

function RiskBadge({ level }: { level: "low" | "medium" | "high" }) {
  const styles = {
    high: "bg-red-500/20 text-red-300 border-red-500/50",
    medium: "bg-amber-500/20 text-amber-300 border-amber-500/50",
    low: "bg-green-500/20 text-green-300 border-green-500/50",
  };
  return (
    <span className={`rounded border px-1.5 py-0.5 text-[9px] font-bold uppercase ${styles[level]}`}>
      {level}
    </span>
  );
}

export default function AlertsPanel({ alerts }: AlertsPanelProps) {
  if (alerts.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <span className="inline-block h-2 w-2 rounded-full bg-green-500" />
          Movement Alerts
        </h3>
        <p className="text-xs text-green-400/80">
          All clear — no convergences detected in current forecast window.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span className={`inline-block h-2 w-2 rounded-full ${
          alerts.some((a) => a.riskLevel === "high") ? "bg-red-500 animate-pulse" : "bg-amber-500"
        }`} />
        Movement Alerts ({alerts.length})
      </h3>
      <p className="text-[10px] text-gray-500">
        Peacekeepers: coordinate safer routes with community leaders.
      </p>
      <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto pr-1">
        {alerts.map((alert) => (
          <li
            key={alert.id}
            className={`rounded border px-3 py-2 text-xs ${
              alert.riskLevel === "high"
                ? "border-red-500/50 bg-red-950/30 text-red-100"
                : alert.riskLevel === "medium"
                ? "border-amber-500/40 bg-amber-950/20 text-amber-100"
                : "border-green-500/30 bg-green-950/20 text-green-100"
            }`}
          >
            {/* Header: risk badge + time */}
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <RiskBadge level={alert.riskLevel} />
              <span className="text-[10px] text-gray-400">
                {alert.daysAway} day{alert.daysAway > 1 ? "s" : ""} away
              </span>
            </div>

            {/* Location */}
            <p className="mb-1 text-[10px] font-semibold text-gray-300">{alert.location}</p>
            <p className="mb-1 text-[10px] text-gray-500">
              {alert.riskCategory === "community_protection"
                ? "Community protection risk"
                : "Resource tension risk"}{" "}
              · {alert.thresholdProfile.county} · {alert.thresholdProfile.season}
            </p>

            {/* Reason */}
            <p className="font-medium leading-snug">{alert.reason}</p>

            {/* Triggers */}
            <div className="mt-1.5 flex flex-wrap gap-1">
              {alert.triggers.herdConvergence && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-400">convergence</span>
              )}
              {alert.triggers.resourceScarcity && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-400">low resources</span>
              )}
              {alert.triggers.nearVillage && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-400">near village</span>
              )}
              {alert.triggers.nearFarmland && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-400">near farmland</span>
              )}
              {alert.triggers.historicalConflict && (
                <span className="rounded bg-white/5 px-1 py-0.5 text-[9px] text-gray-400">conflict history</span>
              )}
            </div>

            {/* Suggested actions (summary) */}
            <div className="mt-2 border-t border-white/5 pt-1.5">
              <p className="text-[10px] font-semibold text-gray-400">Suggested:</p>
              <ul className="mt-0.5 list-inside list-disc space-y-0.5 text-[10px] opacity-90">
                {alert.suggestedActions.map((s, i) => (
                  <li key={i}>{s.description}</li>
                ))}
              </ul>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
