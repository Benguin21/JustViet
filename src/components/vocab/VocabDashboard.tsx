"use client";

import { useMemo } from "react";
import {
  computeDailyAverage,
  computeForecast,
  computeHeatmapMonthLabels,
  computeProgressStats,
  computeReviewHeatmap,
  computeStudyStreaks,
  computeTodayStats,
  type HeatmapDay,
} from "@/lib/vocab/scheduler";
import { useNow } from "@/lib/useNow";
import type { ReviewLogEntry, VocabCard } from "@/lib/vocab/types";

const HEATMAP_WINDOW_DAYS = 98; // ~14 weeks, like GitHub's default contribution view
const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Keep in sync with the square's `h-*`/`w-*` and the grid's `gap-*` classes
// below — the month labels are positioned with inline styles computed from
// these, since Tailwind classes can't express a per-label dynamic offset.
const SQUARE_PX = 24;
const GAP_PX = 4;

function heatColor(count: number): string {
  if (count === 0) return "bg-ink-300/15";
  if (count <= 2) return "bg-yellow-200";
  if (count <= 5) return "bg-yellow-400";
  if (count <= 10) return "bg-red-400";
  return "bg-red-600";
}

/** Paired with `heatColor`'s buckets so the in-square count stays readable against either light or dark fills. */
function heatTextColor(count: number): string {
  return count <= 5 ? "text-ink-900" : "text-white";
}

/** Keeps large counts from overflowing the square; realistically rare for a personal vocab app, but cheap to handle. */
function formatCount(count: number): string {
  return count < 1000 ? String(count) : `${Math.round(count / 100) / 10}k`;
}

function heatmapCellLabel(cell: HeatmapDay): string {
  const date = new Date(cell.date).toLocaleDateString(undefined, {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
  return `${date} — ${cell.count} card${cell.count === 1 ? "" : "s"} studied`;
}

export function VocabDashboard({
  cards,
  reviewLogs,
}: {
  cards: VocabCard[];
  reviewLogs: ReviewLogEntry[];
}) {
  const now = useNow();
  const today = useMemo(() => computeTodayStats(cards, now), [cards, now]);
  const progress = useMemo(() => computeProgressStats(cards), [cards]);
  const forecast = useMemo(() => computeForecast(cards, now, 14), [cards, now]);
  const heatmap = useMemo(
    () => computeReviewHeatmap(reviewLogs, now, HEATMAP_WINDOW_DAYS),
    [reviewLogs, now],
  );
  const monthLabels = useMemo(() => computeHeatmapMonthLabels(heatmap), [heatmap]);
  const dailyAverage = useMemo(() => computeDailyAverage(heatmap), [heatmap]);
  // Streaks use the complete review history the app has loaded, not just
  // the visible heatmap window — a streak can be older than 98 days.
  const streaks = useMemo(() => computeStudyStreaks(reviewLogs, now), [reviewLogs, now]);

  const maxForecast = Math.max(1, ...forecast.map((d) => d.count));
  const monthRowWidthPx = Math.ceil(heatmap.length / 7) * (SQUARE_PX + GAP_PX);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      <div className="rounded-2xl border border-ink-300/20 bg-surface p-4">
        <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-500 uppercase">Today</h3>
        <div className="flex gap-6">
          <MiniStat value={today.due} label="Due" tone="text-red-500" />
          <MiniStat value={today.new} label="New" tone="text-sky-600" />
          <MiniStat value={today.reviews} label="Reviews" tone="text-success-dark" />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-300/20 bg-surface p-4">
        <h3 className="mb-2 text-xs font-bold tracking-wide text-ink-500 uppercase">Progress</h3>
        <div className="flex flex-wrap gap-6">
          <MiniStat value={progress.total} label="Total Cards" tone="text-ink-900" />
          <MiniStat value={progress.learning} label="Learning" tone="text-yellow-600" />
          <MiniStat value={progress.mature} label="Mature" tone="text-success-dark" />
          <MiniStat value={progress.suspended} label="Suspended" tone="text-ink-500" />
        </div>
      </div>

      <div className="rounded-2xl border border-ink-300/20 bg-surface p-4 lg:col-span-2">
        <h3 className="mb-3 text-xs font-bold tracking-wide text-ink-500 uppercase">
          Review Forecast
        </h3>
        <div className="flex items-end gap-1.5" style={{ height: 72 }}>
          {forecast.map((day) => (
            <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
              <div
                title={`${new Date(day.date).toLocaleDateString()}: ${day.count} due`}
                className="w-full rounded-t bg-red-300"
                style={{ height: `${Math.max(4, (day.count / maxForecast) * 56)}px` }}
              />
              <span className="text-[10px] font-semibold text-ink-300">
                {new Date(day.date).toLocaleDateString(undefined, { weekday: "narrow" })}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-ink-300/20 bg-surface p-4 lg:col-span-2">
        <h3 className="mb-3 text-xs font-bold tracking-wide text-ink-500 uppercase">
          Study Activity
        </h3>

        <div className="mb-4 flex gap-6">
          <MiniStat value={Math.round(dailyAverage)} label="Daily Average" tone="text-red-500" />
          <MiniStat value={streaks.current} label="Current Streak" tone="text-yellow-600" />
          <MiniStat value={streaks.longest} label="Longest Streak" tone="text-success-dark" />
        </div>

        <div className="flex items-start gap-2">
          {/* Weekday labels: a fixed column outside the scroll area, so they
              stay put while the squares scroll horizontally. */}
          <div className="grid shrink-0 grid-rows-7" style={{ rowGap: GAP_PX }}>
            {WEEKDAY_LABELS.map((label) => (
              <div
                key={label}
                className="flex items-center text-[10px] font-semibold text-ink-300"
                style={{ height: SQUARE_PX }}
              >
                {label}
              </div>
            ))}
          </div>

          {/* Squares + month labels scroll together so they stay in sync. */}
          <div className="overflow-x-auto pb-1">
            <div style={{ width: "max-content" }}>
              <div
                className="grid grid-flow-col grid-rows-7"
                style={{ gap: GAP_PX }}
              >
                {heatmap.map((cell, index) =>
                  cell === null ? (
                    <div key={`pad-${index}`} aria-hidden="true" style={{ height: SQUARE_PX, width: SQUARE_PX }} />
                  ) : (
                    <div
                      key={cell.date}
                      role="img"
                      tabIndex={0}
                      title={heatmapCellLabel(cell)}
                      aria-label={heatmapCellLabel(cell)}
                      className={`flex items-center justify-center rounded-sm text-[9px] font-bold leading-none focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 ${heatColor(cell.count)} ${heatTextColor(cell.count)}`}
                      style={{ height: SQUARE_PX, width: SQUARE_PX }}
                    >
                      {cell.count > 0 ? formatCount(cell.count) : ""}
                    </div>
                  ),
                )}
              </div>

              <div className="relative mt-1 h-4" style={{ width: monthRowWidthPx }}>
                {monthLabels.map((month) => (
                  <span
                    key={`${month.columnIndex}-${month.label}`}
                    className="absolute text-[10px] font-semibold text-ink-300"
                    style={{ left: month.columnIndex * (SQUARE_PX + GAP_PX) }}
                  >
                    {month.label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label, tone }: { value: number; label: string; tone: string }) {
  return (
    <div>
      <div className={`font-heading text-2xl font-extrabold ${tone}`}>{value}</div>
      <div className="text-xs font-bold tracking-wide text-ink-500 uppercase">{label}</div>
    </div>
  );
}
