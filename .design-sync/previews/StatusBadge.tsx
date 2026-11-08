import { StatusBadge } from "justviet-app";

export const AllStatuses = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <StatusBadge status="new" />
    <StatusBadge status="learning" />
    <StatusBadge status="review" />
    <StatusBadge status="relearning" />
    <StatusBadge status="suspended" />
  </div>
);
