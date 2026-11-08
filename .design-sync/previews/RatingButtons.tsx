import { RatingButtons } from "justviet-app";

const previews = {
  again: { rating: "again", dueAt: 0, scheduledDays: 0, label: "10 min" },
  hard: { rating: "hard", dueAt: 0, scheduledDays: 1, label: "1 day" },
  good: { rating: "good", dueAt: 0, scheduledDays: 4, label: "4 days" },
  easy: { rating: "easy", dueAt: 0, scheduledDays: 12, label: "12 days" },
} as const;

export const Default = () => (
  <div style={{ width: 640 }}>
    <RatingButtons previews={previews} onRate={() => {}} />
  </div>
);

export const Disabled = () => (
  <div style={{ width: 640 }}>
    <RatingButtons previews={previews} onRate={() => {}} disabled />
  </div>
);
