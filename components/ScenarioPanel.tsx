"use client";

import type { ScenarioParams } from "@/lib/heatScore";

type ScenarioPanelProps = {
  scenario: ScenarioParams;
  onChange: (params: Partial<ScenarioParams>) => void;
};

export default function ScenarioPanel({ scenario, onChange }: ScenarioPanelProps) {
  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Scenario (Simulator)
      </h3>

      <div>
        <label className="block text-xs text-gray-500">Rainfall anomaly</label>
        <input
          type="range"
          min={-1}
          max={1}
          step={0.1}
          value={scenario.rainfallAnomaly}
          onChange={(e) => onChange({ rainfallAnomaly: Number(e.target.value) })}
          className="mt-1 h-2 w-full accent-green-500"
        />
        <span className="text-xs text-gray-500">
          Drought ← → Wet
        </span>
      </div>

      <div>
        <label className="block text-xs text-gray-500">Drought severity</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scenario.droughtSeverity}
          onChange={(e) => onChange({ droughtSeverity: Number(e.target.value) })}
          className="mt-1 h-2 w-full accent-amber-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500">Flood extent</label>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={scenario.floodExtent}
          onChange={(e) => onChange({ floodExtent: Number(e.target.value) })}
          className="mt-1 h-2 w-full accent-blue-500"
        />
      </div>

      <div>
        <label className="block text-xs text-gray-500">Seasonal shift (weeks)</label>
        <input
          type="range"
          min={-4}
          max={4}
          step={1}
          value={scenario.seasonalShift}
          onChange={(e) => onChange({ seasonalShift: Number(e.target.value) })}
          className="mt-1 h-2 w-full accent-green-500"
        />
      </div>
    </div>
  );
}
