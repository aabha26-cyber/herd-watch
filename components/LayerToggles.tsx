"use client";

type LayerTogglesProps = {
  herds: boolean;
  trails: boolean;
  predictedPaths: boolean;
  riskZones: boolean;
  peacekeeping: boolean;
  farms: boolean;
  altRoutes: boolean;
  heatmap: boolean;
  water: boolean;
  villages: boolean;
  conflictZones: boolean;
  onHerds: (v: boolean) => void;
  onTrails: (v: boolean) => void;
  onPredictedPaths: (v: boolean) => void;
  onRiskZones: (v: boolean) => void;
  onPeacekeeping: (v: boolean) => void;
  onFarms: (v: boolean) => void;
  onAltRoutes: (v: boolean) => void;
  onHeatmap: (v: boolean) => void;
  onWater: (v: boolean) => void;
  onVillages: (v: boolean) => void;
  onConflictZones: (v: boolean) => void;
};

type ToggleRowProps = {
  checked: boolean;
  onChange: (v: boolean) => void;
  color: string;
  label: string;
};

function ToggleRow({ checked, onChange, color, label }: ToggleRowProps) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-gray-600 bg-surface-800"
        style={{ accentColor: color }}
      />
      <span className="flex items-center gap-1.5 text-sm text-gray-300">
        <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: color }} />
        {label}
      </span>
    </label>
  );
}

export default function LayerToggles(props: LayerTogglesProps) {
  return (
    <div className="space-y-1.5">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Layers
      </h3>

      <p className="text-[10px] uppercase tracking-wider text-gray-500">Cattle</p>
      <ToggleRow checked={props.herds} onChange={props.onHerds} color="#22c55e" label="Herds (current)" />
      <ToggleRow checked={props.trails} onChange={props.onTrails} color="#4ade80" label="Movement trails" />
      <ToggleRow checked={props.predictedPaths} onChange={props.onPredictedPaths} color="#3b82f6" label="Predicted paths" />

      <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-500">Risk</p>
      <ToggleRow checked={props.riskZones} onChange={props.onRiskZones} color="#ef4444" label="Risk zones" />
      <ToggleRow checked={props.altRoutes} onChange={props.onAltRoutes} color="#eab308" label="Alternative routes" />
      <ToggleRow checked={props.conflictZones} onChange={props.onConflictZones} color="#991b1b" label="Conflict history" />

      <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-500">Environment</p>
      <ToggleRow checked={props.heatmap} onChange={props.onHeatmap} color="#84cc16" label="Vegetation heatmap" />
      <ToggleRow checked={props.water} onChange={props.onWater} color="#38bdf8" label="Water bodies" />

      <p className="mt-2 text-[10px] uppercase tracking-wider text-gray-500">Infrastructure</p>
      <ToggleRow checked={props.villages} onChange={props.onVillages} color="#f8fafc" label="Villages" />
      <ToggleRow checked={props.peacekeeping} onChange={props.onPeacekeeping} color="#2563eb" label="Peacekeeping" />
      <ToggleRow checked={props.farms} onChange={props.onFarms} color="#d97706" label="Farms" />
    </div>
  );
}
