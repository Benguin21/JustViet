"use client";

import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { StatusBadge } from "@/components/vocab/StatusBadge";
import { effectiveStatus, formatDueDate } from "@/lib/vocab/srs";
import type { VocabCard } from "@/lib/vocab/types";

type CardRowProps = {
  card: VocabCard;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStudy: () => void;
};

export function CardRow({ card, onSelect, onEdit, onDelete, onStudy }: CardRowProps) {
  return (
    <tr
      onClick={onSelect}
      className="cursor-pointer border-t border-ink-300/20 hover:bg-yellow-50"
    >
      <td className="px-4 py-3">
        <div className="font-heading font-bold text-ink-900">{card.front}</div>
      </td>
      <td className="px-4 py-3 text-ink-700">{card.back}</td>
      <td className="px-4 py-3 text-ink-500 capitalize">{card.partOfSpeech || "—"}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {card.tags.slice(0, 3).map((tag) => (
            <Badge key={tag} tone="yellow">
              {tag}
            </Badge>
          ))}
          {card.tags.length > 3 && (
            <span className="text-xs font-semibold text-ink-500">+{card.tags.length - 3}</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge status={effectiveStatus(card)} />
      </td>
      <td className="px-4 py-3 text-ink-700">
        {card.suspended ? "—" : formatDueDate(card.due)}
      </td>
      <td className="px-4 py-3 text-center text-ink-500">{card.reviewCount}</td>
      <td className="px-4 py-3 text-center text-ink-500">
        {card.difficulty > 0 ? card.difficulty.toFixed(1) : "—"}
      </td>
      <td className="px-4 py-3">
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={onStudy}
            aria-label={`Review ${card.front}`}
          >
            Review
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={onEdit}
            aria-label={`Edit ${card.front}`}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            fullWidth={false}
            onClick={onDelete}
            className="text-red-500 hover:bg-red-50"
            aria-label={`Delete ${card.front}`}
          >
            Delete
          </Button>
        </div>
      </td>
    </tr>
  );
}
