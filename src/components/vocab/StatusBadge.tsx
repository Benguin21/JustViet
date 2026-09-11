import { Badge } from "@/components/ui/Badge";
import { statusLabel } from "@/lib/vocab/scheduler";
import type { CardStatus } from "@/lib/vocab/types";

const STATUS_TONE: Record<CardStatus, "gray" | "yellow" | "red" | "green" | "blue"> = {
  new: "blue",
  learning: "yellow",
  review: "green",
  relearning: "red",
  suspended: "gray",
};

export function StatusBadge({ status }: { status: CardStatus }) {
  return <Badge tone={STATUS_TONE[status]}>{statusLabel(status)}</Badge>;
}
