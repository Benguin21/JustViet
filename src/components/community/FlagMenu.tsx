"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export interface FlagMenuItem {
  label: string;
  onSelect: () => void;
  disabled?: boolean;
}

function FlagIcon() {
  return (
    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 17.5V3" />
      <path d="M5 3.5h9.5l-2 3.25 2 3.25H5" />
    </svg>
  );
}

/**
 * The small flag in the bottom-right corner of a post, answer, comment or
 * reply. Report, Hide and Block live in its menu so they don't crowd the
 * everyday actions. A menu button: it opens upwards, the arrow keys, Home
 * and End move between items, and Escape, Tab or a click outside closes it.
 */
export function FlagMenu({ label, items }: { label: string; items: FlagMenuItem[] }) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    itemRefs.current.find((el) => el && !el.disabled)?.focus();
    function onPointerDown(e: PointerEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  if (items.length === 0) return null;

  function close() {
    setOpen(false);
    buttonRef.current?.focus();
  }

  function onMenuKeyDown(e: KeyboardEvent) {
    const els = itemRefs.current.filter((el): el is HTMLButtonElement => el != null && !el.disabled);
    if (els.length === 0) return;
    const i = els.indexOf(document.activeElement as HTMLButtonElement);
    const focus = (n: number) => els[(n + els.length) % els.length].focus();
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      focus(i + 1);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      focus(i - 1);
    } else if (e.key === "Home") {
      e.preventDefault();
      focus(0);
    } else if (e.key === "End") {
      e.preventDefault();
      focus(els.length - 1);
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            setOpen(true);
          }
        }}
        className={`flex h-8 w-8 items-center justify-center rounded-lg text-ink-500 hover:bg-yellow-50 hover:text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 ${
          open ? "bg-yellow-50 text-ink-900" : ""
        }`}
      >
        <FlagIcon />
      </button>
      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={label}
          onKeyDown={onMenuKeyDown}
          className="absolute right-0 bottom-full z-20 mb-1 flex min-w-44 flex-col rounded-2xl border-2 border-ink-300/30 bg-surface p-1 shadow-[0_6px_0_rgba(74,47,34,0.08)]"
        >
          {items.map((item, i) => (
            <button
              key={item.label}
              ref={(el) => {
                itemRefs.current[i] = el;
              }}
              type="button"
              role="menuitem"
              tabIndex={-1}
              disabled={item.disabled}
              onClick={() => {
                close();
                item.onSelect();
              }}
              className="rounded-xl px-3 py-2 text-left text-sm font-bold whitespace-nowrap text-ink-700 hover:bg-yellow-50 hover:text-ink-900 focus:bg-yellow-50 focus:text-ink-900 focus:outline-none disabled:opacity-50"
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
