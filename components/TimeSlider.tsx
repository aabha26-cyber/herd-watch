"use client";

import { useEffect, useRef, useState } from "react";

type TimeSliderProps = {
  /** Current day offset (0 = today, 1+ = predicted) */
  dayOffset: number;
  /** Max forecast days */
  maxDays: number;
  onSelect: (dayOffset: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
};

const SPEED_OPTIONS = [
  { label: "0.5x", ms: 2400 },
  { label: "1x", ms: 1200 },
  { label: "2x", ms: 600 },
  { label: "3x", ms: 350 },
];

function confidenceAtDay(day: number): number {
  return Math.max(20, Math.round((1 - day * 0.07) * 100));
}

export default function TimeSlider({
  dayOffset,
  maxDays,
  onSelect,
  isPlaying,
  onPlayPause,
}: TimeSliderProps) {
  const [speedIdx, setSpeedIdx] = useState(1);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressPct = (dayOffset / maxDays) * 100;

  // Auto-advance
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!isPlaying) return;
    intervalRef.current = setInterval(() => {
      onSelect(-1); // sentinel: parent cycles to next day
    }, SPEED_OPTIONS[speedIdx].ms);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isPlaying, speedIdx, onSelect]);

  const conf = confidenceAtDay(dayOffset);
  const confColor =
    conf >= 80
      ? "text-emerald-400"
      : conf >= 60
        ? "text-green-400"
        : conf >= 40
          ? "text-amber-400"
          : "text-red-400";

  return (
    <div className="flex items-center gap-4">
      {/* ── Big Play/Pause button ── */}
      <button
        type="button"
        onClick={onPlayPause}
        className={`group relative flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 transition-all ${
          isPlaying
            ? "border-amber-400/60 bg-amber-500/20 hover:bg-amber-500/30"
            : "border-emerald-400/60 bg-emerald-500/20 hover:bg-emerald-500/30"
        }`}
        title={isPlaying ? "Pause autoplay" : "Start autoplay"}
      >
        {isPlaying ? (
          <svg
            className="h-4 w-4 text-amber-300"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <rect x="6" y="4" width="4" height="16" rx="1" />
            <rect x="14" y="4" width="4" height="16" rx="1" />
          </svg>
        ) : (
          <svg
            className="ml-0.5 h-4 w-4 text-emerald-300"
            viewBox="0 0 24 24"
            fill="currentColor"
          >
            <polygon points="6,3 20,12 6,21" />
          </svg>
        )}
        {/* Spinning ring while playing */}
        {isPlaying && (
          <span
            className="absolute inset-0 animate-spin rounded-full border-2 border-transparent border-t-amber-400/40"
            style={{
              animationDuration: `${SPEED_OPTIONS[speedIdx].ms * (maxDays + 1)}ms`,
            }}
          />
        )}
      </button>

      {/* ── Main timeline area ── */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        {/* Top row: info + speed control */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`text-[10px] font-medium ${confColor}`}>
              {dayOffset === 0
                ? "Current positions"
                : `Day ${dayOffset} forecast · ${conf}% confidence`}
            </span>
            {dayOffset > 0 && (
              <span className="text-[10px] text-gray-600">
                ~{Math.round(dayOffset * 15)}km avg movement
              </span>
            )}
          </div>

          {/* Speed pills */}
          <div className="flex items-center gap-1">
            <span className="mr-1 text-[9px] uppercase tracking-wider text-gray-600">
              Speed
            </span>
            {SPEED_OPTIONS.map((opt, i) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => setSpeedIdx(i)}
                className={`rounded px-1.5 py-0.5 text-[10px] font-medium transition-all ${
                  i === speedIdx
                    ? "bg-white/10 text-white"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Progress track with dots */}
        <div className="relative h-4 flex items-center">
          {/* Background track */}
          <div className="absolute left-0 right-0 h-1 rounded-full bg-surface-700" />

          {/* Filled bar */}
          <div
            className="absolute left-0 h-1 rounded-full transition-all duration-300 ease-out"
            style={{
              width: `${progressPct}%`,
              background:
                dayOffset === 0
                  ? "#10b981"
                  : `linear-gradient(90deg, #10b981 0%, ${
                      dayOffset <= 3
                        ? "#22c55e"
                        : dayOffset <= 5
                          ? "#eab308"
                          : "#ef4444"
                    } 100%)`,
            }}
          />

          {/* Clickable day dots */}
          {Array.from({ length: maxDays + 1 }, (_, i) => {
            const isActive = i === dayOffset;
            const isPast = i < dayOffset;
            const pct = (i / maxDays) * 100;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                className="group absolute -translate-x-1/2 flex flex-col items-center"
                style={{ left: `${pct}%` }}
                title={i === 0 ? "Today" : `Day ${i}`}
              >
                <div
                  className={`rounded-full transition-all duration-200 ${
                    isActive
                      ? "h-4 w-4 border-[2.5px] border-white bg-white shadow-[0_0_10px_rgba(255,255,255,0.5)]"
                      : isPast
                        ? "h-2.5 w-2.5 border-2 border-emerald-400 bg-emerald-400 group-hover:scale-125"
                        : "h-2.5 w-2.5 border-2 border-surface-500 bg-surface-600 group-hover:border-gray-400 group-hover:bg-gray-500 group-hover:scale-125"
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Day labels */}
        <div className="relative flex justify-between">
          {Array.from({ length: maxDays + 1 }, (_, i) => {
            const isActive = i === dayOffset;
            const label = i === 0 ? "Now" : `D${i}`;
            return (
              <button
                key={i}
                type="button"
                onClick={() => onSelect(i)}
                className={`w-0 text-center text-[10px] transition-all ${
                  isActive
                    ? "font-bold text-white"
                    : "text-gray-600 hover:text-gray-400"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Reset button ── */}
      {dayOffset > 0 && (
        <button
          type="button"
          onClick={() => onSelect(0)}
          className="flex-shrink-0 rounded-md border border-white/10 px-2 py-1 text-[10px] text-gray-500 transition hover:border-white/20 hover:text-gray-300"
        >
          Reset
        </button>
      )}
    </div>
  );
}
