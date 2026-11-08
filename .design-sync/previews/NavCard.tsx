import { NavCard } from "justviet-app";

export const Red = () => (
  <div style={{ width: 300 }}>
    <NavCard href="/goals" icon="🎯" label="Goals" description="Set and track your learning targets" tone="red" />
  </div>
);

export const Yellow = () => (
  <div style={{ width: 300 }}>
    <NavCard href="/vocab-srs" icon="🧠" label="Vocab SRS" description="Review words with spaced repetition" tone="yellow" />
  </div>
);

export const DashboardGrid = () => (
  <div className="grid grid-cols-2 gap-5" style={{ width: 600 }}>
    <NavCard href="/goals" icon="🎯" label="Goals" description="Set and track your learning targets" tone="red" />
    <NavCard href="/grammar" icon="📖" label="Grammar" description="Learn how Vietnamese sentences work" tone="yellow" />
    <NavCard href="/dictionary" icon="🔎" label="Dictionary" description="Look up words and their meanings" tone="red" />
    <NavCard href="/vocab-srs" icon="🧠" label="Vocab SRS" description="Review words with spaced repetition" tone="yellow" />
    <NavCard href="/skills" icon="🌟" label="Skills" description="Practice reading, listening, and speaking" tone="red" />
    <NavCard href="/community" icon="💬" label="Community" description="Connect with other learners" tone="yellow" />
  </div>
);
