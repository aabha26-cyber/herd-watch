"use client";

type TimeSliderProps = {
  /** Current day offset (0 = today, 1-4 = predicted) */
  dayOffset: number;
  /** Max forecast days */
  maxDays: number;
  onSelect: (dayOffset: number) => void;
  isPlaying: boolean;
  onPlayPause: () => void;
};

const DAY_LABELS = ["Today", "Day 1", "Day 2", "Day 3", "Day 4"];

export default function TimeSlider({
  dayOffset,
  maxDays,
  onSelect,
  isPlaying,
  onPlayPause,
}: TimeSliderProps) {
  return (
    <div className="flex flex-col gap-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-gray-400">
          Prediction Timeline
        </span>
        <button
          type="button"
          onClick={onPlayPause}
          className="flex items-center gap-1.5 rounded bg-surface-700 px-2.5 py-1 text-xs text-gray-300 transition hover:bg-surface-600"
        >
          {isPlaying ? (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
              Pause
            </>
          ) : (
            <>
              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21" />
              </svg>
              Play
            </>
          )}
        </button>
      </div>

      {/* Slider */}
      <input
        type="range"
        min={0}
        max={maxDays}
        value={dayOffset}
        onChange={(e) => onSelect(Number(e.target.value))}
        className="h-2 w-full cursor-pointer appearance-none rounded-full bg-surface-700 accent-green-500"
      />

      {/* Day labels */}
      <div className="flex justify-between text-[10px]">
        {Array.from({ length: maxDays + 1 }, (_, i) => (
          <button
            key={i}
            type="button"
            onClick={() => onSelect(i)}
            className={`rounded px-1.5 py-0.5 transition ${
              i === dayOffset
                ? "bg-green-500/20 font-semibold text-green-300"
                : "text-gray-500 hover:text-gray-300"
            }`}
          >
            {DAY_LABELS[i] ?? `Day ${i}`}
          </button>
        ))}
      </div>

      {/* Status indicator */}
      <div className="flex items-center gap-2">
        <span
          className={`inline-block h-1.5 w-1.5 rounded-full ${
            dayOffset === 0
              ? "bg-green-500"
              : dayOffset <= 2
              ? "bg-amber-400"
              : "bg-red-400"
          }`}
        />
        <span className="text-xs text-gray-400">
          {dayOffset === 0
            ? "Current positions (observed)"
            : `${dayOffset}-day prediction (${Math.max(50, 95 - dayOffset * 10)}% confidence)`}
        </span>
      </div>
    </div>
  );
}
