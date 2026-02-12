"use client";

type ExportPanelProps = {
  onExportPNG: () => void;
  onExportPDF: () => void;
  onExportGeoJSON: () => void;
  onExportFieldBriefing: () => void;
  exporting?: boolean;
};

export default function ExportPanel({
  onExportPNG,
  onExportPDF,
  onExportGeoJSON,
  onExportFieldBriefing,
  exporting = false,
}: ExportPanelProps) {
  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400">
        Export
      </h3>
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={onExportFieldBriefing}
          disabled={exporting}
          className="rounded bg-surface-800 px-3 py-1.5 text-left text-sm font-medium text-gray-300 hover:bg-surface-700 disabled:opacity-50"
        >
          Field briefing (PDF)
        </button>
        <button
          type="button"
          onClick={onExportPNG}
          disabled={exporting}
          className="rounded bg-surface-800 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-surface-700 disabled:opacity-50"
        >
          PNG map
        </button>
        <button
          type="button"
          onClick={onExportPDF}
          disabled={exporting}
          className="rounded bg-surface-800 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-surface-700 disabled:opacity-50"
        >
          PDF summary
        </button>
        <button
          type="button"
          onClick={onExportGeoJSON}
          disabled={exporting}
          className="rounded bg-surface-800 px-3 py-1.5 text-left text-sm text-gray-300 hover:bg-surface-700 disabled:opacity-50"
        >
          GeoJSON
        </button>
      </div>
    </div>
  );
}
