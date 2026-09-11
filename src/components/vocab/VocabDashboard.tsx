"use client";

import { useMemo } from "react";
import {
  computeForecast,
  computeProgressStats,
  computeReviewHeatmap,
  computeTodayStats,
} from "@/lib/vocab/scheduler";
import { useNow } from "@/lib/useNow";
import type { ReviewLogEntry, VocabCard } from "@/lib/vocab/types";

function heatColor(count: number): string {
  if (count === 0) return "bg-ink-300/15";
  if (count <= 2) return "bg-yellow-200";
  if (count <= 5) return "bg-yellow-400";
  if (count <= 10) return "bg-red-400";
  return "bg-red-600";
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
  const heatmap = useMemo(() => computeReviewHeatmap(reviewLogs, now, 98), [reviewLogs, now]);

  const maxForecast = Math.max(1, ...forecast.map((d) => d.count));

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
        <div className="overflow-x-auto">
          <div className="grid grid-flow-col grid-rows-7 gap-1" style={{ width: "max-content" }}>
            {heatmap.map((day) => (
              <div
                key={day.date}
                title={`${new Date(day.date).toLocaleDateString()}: ${day.count} reviewed`}
                className={`h-3 w-3 rounded-sm ${heatColor(day.count)}`}
              />
            ))}
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
