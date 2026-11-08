"use client";

type SwitchProps = {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  /** The switch's accessible name when the visible label alone doesn't say what it controls. */
  ariaLabel?: string;
};

/** An on/off switch: a real button, so it takes focus and toggles with Space or Enter too. */
export function Switch({ checked, onChange, label, description, ariaLabel }: SwitchProps) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4 py-1">
      <span>
        <span className="block font-bold text-ink-900">{label}</span>
        {description && <span className="block text-sm text-ink-500">{description}</span>}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={ariaLabel}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus-visible:ring-4 focus-visible:ring-yellow-300 focus-visible:outline-none ${
          checked ? "bg-red-500" : "bg-ink-300/40"
        }`}
      >
        <span
          className={`inline-block h-5 w-5 transform rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-6" : "translate-x-1"
          }`}
        />
      </button>
    </label>
  );
}
