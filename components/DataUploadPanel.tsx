"use client";

import { useCallback, useRef, useState } from "react";
import { processUploadedFile, type UploadedLayer } from "@/lib/dataUpload";

type DataUploadPanelProps = {
  layers: UploadedLayer[];
  onLayerAdd: (layer: UploadedLayer) => void;
  onLayerToggle: (layerId: string) => void;
  onLayerRemove: (layerId: string) => void;
};

export default function DataUploadPanel({
  layers,
  onLayerAdd,
  onLayerToggle,
  onLayerRemove,
}: DataUploadPanelProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setProcessing(true);
      try {
        const layer = await processUploadedFile(file);
        onLayerAdd(layer);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
      } finally {
        setProcessing(false);
      }
    },
    [onLayerAdd]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      // Reset so same file can be re-uploaded
      e.target.value = "";
    },
    [handleFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  return (
    <div className="space-y-3">
      <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
        <span className="inline-block h-2 w-2 rounded-full bg-violet-500" />
        Upload Data
      </h3>

      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileRef.current?.click()}
        className={`cursor-pointer rounded-lg border-2 border-dashed px-3 py-4 text-center transition ${
          dragOver
            ? "border-violet-400 bg-violet-950/30"
            : "border-white/10 hover:border-white/20 hover:bg-surface-700/30"
        }`}
      >
        <input
          ref={fileRef}
          type="file"
          accept=".geojson,.json,.csv,.kml"
          onChange={handleInputChange}
          className="hidden"
        />
        {processing ? (
          <p className="text-xs text-violet-300">Processing...</p>
        ) : (
          <>
            <p className="text-xs text-gray-400">
              Drop file or <span className="text-violet-400 underline">browse</span>
            </p>
            <p className="mt-1 text-[10px] text-gray-500">
              GeoJSON, CSV (lat/lng), KML
            </p>
          </>
        )}
      </div>

      {error && (
        <p className="rounded bg-red-950/40 px-2 py-1 text-[10px] text-red-300">{error}</p>
      )}

      {/* Uploaded layers list */}
      {layers.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-wider text-gray-500">
            Uploaded layers ({layers.length})
          </p>
          <ul className="space-y-1">
            {layers.map((layer) => (
              <li
                key={layer.id}
                className="flex items-center gap-2 rounded border border-white/5 bg-surface-800 px-2 py-1.5"
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-sm"
                  style={{ backgroundColor: layer.color }}
                />
                <label className="flex flex-1 cursor-pointer items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={layer.visible}
                    onChange={() => onLayerToggle(layer.id)}
                    className="rounded border-gray-600 bg-surface-800 text-violet-500"
                  />
                  <span className="truncate text-xs text-gray-300">{layer.name}</span>
                  <span className="ml-auto whitespace-nowrap text-[10px] text-gray-500">
                    {layer.featureCount} ft · {layer.fileType}
                  </span>
                </label>
                <button
                  type="button"
                  onClick={() => onLayerRemove(layer.id)}
                  className="text-gray-500 transition hover:text-red-400"
                  title="Remove layer"
                >
                  <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
