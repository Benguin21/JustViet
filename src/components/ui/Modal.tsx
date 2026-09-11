"use client";

import { useEffect, type ReactNode } from "react";

type ModalProps = {
  title: string;
  onClose: () => void;
  children: ReactNode;
  maxWidth?: "md" | "lg" | "xl" | "2xl";
};

const MAX_WIDTH_CLASSES = {
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  "2xl": "max-w-4xl",
};

/** A centered modal dialog: Escape and backdrop-click both close it, and body scroll is locked while open. */
export function Modal({ title, onClose, children, maxWidth = "lg" }: ModalProps) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className={`flex max-h-[90vh] w-full ${MAX_WIDTH_CLASSES[maxWidth]} flex-col rounded-3xl bg-surface shadow-xl`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b-2 border-ink-300/20 px-6 py-4">
          <h2 id="modal-title" className="font-heading text-xl font-extrabold text-ink-900">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-ink-500 hover:bg-yellow-50 hover:text-ink-900"
          >
            <span className="block px-2 text-2xl leading-none">×</span>
          </button>
        </div>
        <div className="overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
