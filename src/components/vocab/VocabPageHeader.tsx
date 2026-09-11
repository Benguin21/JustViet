"use client";

import { Button } from "@/components/ui/Button";

export type VocabTab = "cards" | "study" | "settings";

const TABS: { value: VocabTab; label: string }[] = [
  { value: "cards", label: "Cards" },
  { value: "study", label: "Study" },
  { value: "settings", label: "Settings" },
];

type VocabPageHeaderProps = {
  totalCards: number;
  dueToday: number;
  activeTab: VocabTab;
  onTabChange: (tab: VocabTab) => void;
  onAddCard: () => void;
  onImportCards: () => void;
};

export function VocabPageHeader({
  totalCards,
  dueToday,
  activeTab,
  onTabChange,
  onAddCard,
  onImportCards,
}: VocabPageHeaderProps) {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-heading text-3xl font-extrabold text-ink-900">Vocab</h1>
          <p className="mt-1 font-semibold text-ink-500">
            {totalCards} card{totalCards === 1 ? "" : "s"} · {dueToday} due today
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onImportCards} variant="outline" fullWidth={false} className="px-6">
            Import Cards
          </Button>
          <Button onClick={onAddCard} fullWidth={false} className="px-6">
            + Add Card
          </Button>
        </div>
      </div>

      <div className="flex w-full max-w-sm rounded-2xl bg-yellow-100 p-1">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange(tab.value)}
            className={`flex-1 rounded-xl py-2 text-sm font-bold tracking-wide uppercase transition-colors ${
              activeTab === tab.value ? "bg-surface text-red-500 shadow-sm" : "text-ink-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
