"use client";

import type { SuggestedAction } from "@/lib/risk";

type SuggestedActionsPanelProps = {
  actions: SuggestedAction[];
};

export default function SuggestedActionsPanel({ actions }: SuggestedActionsPanelProps) {
  if (actions.length === 0) {
    return (
      <div className="space-y-2">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
          Suggested Actions
        </h3>
        <p className="text-xs text-gray-500">
          No rerouting needed — all paths are safe.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Suggested Actions
      </h3>
      <p className="text-[10px] text-gray-500">
        Guidance only — coordinate with community leaders.
      </p>
      <ul className="flex flex-col gap-2">
        {actions.map((action, i) => (
          <li
            key={`${action.herdId}-${action.type}-${i}`}
            className={`rounded border px-3 py-2 ${
              action.type === "redirect"
                ? "border-emerald-500/40 bg-emerald-950/20"
                : action.type === "delay"
                ? "border-amber-500/40 bg-amber-950/20"
                : "border-blue-500/40 bg-blue-950/20"
            }`}
          >
            {/* Action type badge */}
            <div className="mb-1 flex items-center gap-2">
              <span
                className={`rounded px-1.5 py-0.5 text-[9px] font-bold uppercase ${
                  action.type === "redirect"
                    ? "bg-emerald-500/20 text-emerald-300"
                    : action.type === "delay"
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-blue-500/20 text-blue-300"
                }`}
              >
                {action.type}
              </span>
              <span className="text-[10px] text-gray-400">{action.herdId}</span>
            </div>

            {/* Description */}
            <p className="text-xs font-medium text-gray-200">{action.description}</p>

            {/* Impact estimate */}
            <p className="mt-1 text-[10px] text-gray-400">{action.impactEstimate}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
