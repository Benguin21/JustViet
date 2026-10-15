import { Badge } from "justviet-app";

export const Tones = () => (
  <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
    <Badge tone="gray">Suspended</Badge>
    <Badge tone="yellow">Learning</Badge>
    <Badge tone="red">Relearning</Badge>
    <Badge tone="green">Review</Badge>
    <Badge tone="blue">New</Badge>
  </div>
);

export const InContext = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
    <span className="font-heading text-xl font-extrabold text-ink-900">cảm ơn</span>
    <Badge tone="yellow">Phrase</Badge>
    <Badge>food</Badge>
  </div>
);
