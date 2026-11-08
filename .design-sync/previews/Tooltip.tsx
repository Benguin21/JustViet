import { Tooltip } from "justviet-app";

// The hint bubble only appears on hover/focus; this shows the resting "?"
// beside a settings label, which is how the app uses it.
export const SettingHint = () => (
  <div style={{ width: 360, paddingTop: 8 }}>
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold tracking-wide text-ink-700 uppercase">Desired retention</span>
      <Tooltip text="How likely you want to be to remember a card when it comes up for review. Higher means more frequent reviews." />
    </div>
  </div>
);

// Forces the hover state on so the bubble itself is visible in the card.
export const Open = () => (
  <div style={{ width: 360, paddingTop: 90, paddingLeft: 100 }} className="[&_[role=tooltip]]:opacity-100">
    <div className="flex items-center gap-2">
      <span className="text-sm font-bold tracking-wide text-ink-700 uppercase">Learning steps</span>
      <Tooltip text="Short intervals a new card goes through before it graduates to regular reviews." />
    </div>
  </div>
);
