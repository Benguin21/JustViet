"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { TEACHER_ART } from "@/components/companion/art";
import { TEACHERS, type Expression, type TeacherId } from "@/lib/lessons/teachers";
// The guide card's styles are Home's (scoped under .jv-root, see AGENTS.md "Homepage").
import "@/components/companion/companion.css";

export interface TeacherGuideStep {
  who: TeacherId;
  expr: Expression;
  /** A short Vietnamese greeting shown before the line, like "Xin chào!". */
  lead?: string;
  text: string;
  /** A small picture or demo shown under the line. */
  visual?: ReactNode;
}

type TeacherGuideProps = {
  /** What the dialog is called for screen readers, e.g. "How Vocabulary works". */
  label: string;
  steps: readonly TeacherGuideStep[];
  /** Skip, "Maybe later" or Esc. */
  onClose: () => void;
  /** The last step's main button. */
  finish: { label: string; onClick: () => void };
};

/**
 * A teacher-led walkthrough in the same card as Home's first-visit intro (HomeView's guide):
 * the speaker's portrait, name and line, a picture or demo for the step, dots, Back / Next and
 * Skip. It's a modal dialog: focus moves into it, Tab stays inside, Esc skips, and focus goes back
 * where it was when it closes. Every step shares one grid cell (only the current one is
 * visible), so the card keeps its size from step to step.
 */
export function TeacherGuide({ label, steps, onClose, finish }: TeacherGuideProps) {
  const [step, setStep] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const cur = steps[step];
  const who = TEACHERS[cur.who];
  const last = step === steps.length - 1;
  // The portrait pops in again whenever the speaker changes.
  let speakerChanges = 0;
  for (let i = 1; i <= step; i++) if (steps[i].who !== steps[i - 1].who) speakerChanges++;
  const pop = speakerChanges % 2 ? " pop-a" : " pop-b";

  // Focus the main button on open (and back to where it was on close); lock the page's scroll.
  useEffect(() => {
    const from = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cardRef.current?.querySelector<HTMLElement>(".guide-go")?.focus({ preventScroll: true });
    return () => {
      document.body.style.overflow = overflow;
      if (from && document.contains(from)) from.focus({ preventScroll: true });
    };
  }, []);

  // Keep focus on the main button as the steps change (it's re-rendered with a new label).
  useEffect(() => {
    const card = cardRef.current;
    if (card && !card.contains(document.activeElement)) {
      card.querySelector<HTMLElement>(".guide-go")?.focus({ preventScroll: true });
    }
  }, [step]);

  function go(dir: number) {
    const next = step + dir;
    if (next < 0) return;
    if (next >= steps.length) {
      finish.onClick();
      return;
    }
    setStep(next);
  }

  // Esc skips; Tab stays inside the card. Listened for on the document, so it still works when
  // focus has dropped to the page (say a button inside a step went away after being pressed).
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  });
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      const card = cardRef.current;
      if (!card) return;
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = Array.from(card.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]")).filter(
        (el) => el.offsetParent !== null && !el.closest(".guide-step:not(.on)"),
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const lastEl = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (!card.contains(active)) {
        e.preventDefault();
        (e.shiftKey ? lastEl : first).focus();
      } else if (e.shiftKey && (active === first || active === card)) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && active === lastEl) {
        e.preventDefault();
        first.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown, true);
    return () => document.removeEventListener("keydown", onKeyDown, true);
  }, []);

  const textId = `jv-tutorial-text-${step}`;

  return (
    <div className="jv-root">
      <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true" focusable="false">
        <defs dangerouslySetInnerHTML={{ __html: TEACHER_ART }} />
      </svg>
      <div className="sr-only" aria-live="polite">
        {`${who.name}: ${cur.lead ? cur.lead + " " : ""}${cur.text}`}
      </div>
      <div className="guide-layer is-modal">
        <div
          className="guide-card"
          role="dialog"
          aria-modal="true"
          aria-label={`${label}${steps.length > 1 ? `, step ${step + 1} of ${steps.length}` : ""}`}
          aria-describedby={textId}
          tabIndex={-1}
          ref={cardRef}
        >
          {steps.length > 1 && (
            <button type="button" className="guide-skip" onClick={onClose}>
              {last ? "Maybe later" : "Skip intro"}
            </button>
          )}
          <div className="guide-body">
            <div className={`guide-portrait${pop}`} style={{ "--tint": who.tint } as React.CSSProperties} aria-hidden="true">
              <svg className="guide-figure" viewBox="5 8 150 206" width="150" height="206">
                <TeacherArt who={cur.who} expr={cur.expr} />
              </svg>
            </div>
            <div className="guide-main">
              <div className="guide-head">
                <span className={`guide-avatar${pop}`} style={{ "--tint": who.tint } as React.CSSProperties} aria-hidden="true">
                  <svg viewBox="30 8 100 100" width="52" height="52">
                    <TeacherArt who={cur.who} expr={cur.expr} />
                  </svg>
                </span>
                <span className="guide-who">
                  <span className="guide-name" lang="vi">
                    {who.name}
                  </span>
                  <span className="guide-role" style={{ color: who.ink }}>
                    {who.role}
                  </span>
                </span>
              </div>
              <div className="guide-steps">
                {steps.map((st, i) => (
                  <div key={i} className={`guide-step${i === step ? " on" : ""}`} aria-hidden={i !== step}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p className="guide-text" id={`jv-tutorial-text-${i}`}>
                        {st.lead && (
                          <>
                            <span className="guide-lead" lang="vi">
                              {st.lead}
                            </span>{" "}
                          </>
                        )}
                        {st.text}
                      </p>
                      {st.visual && <div className="mt-3">{st.visual}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          {/* Wraps on a phone, so a long last-step label ("Add my first card") drops below the
              dots instead of running off the card. */}
          <div className="guide-foot" style={{ flexWrap: "wrap" }}>
            <span className="guide-dots" aria-hidden="true">
              {steps.length > 1 &&
                steps.map((_, i) => <span key={i} className={`guide-dot${i === step ? " on" : ""}`} />)}
            </span>
            <span className="guide-nav">
              {step > 0 && (
                <button type="button" className="guide-btn guide-back" onClick={() => go(-1)}>
                  Back
                </button>
              )}
              <button type="button" className="guide-btn guide-primary guide-go" onClick={() => go(1)}>
                {last ? finish.label : "Next"}
              </button>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function TeacherArt({ who, expr }: { who: TeacherId; expr: Expression }) {
  return (
    <>
      <use href={`#jvT-${who}-back`} />
      <use href={`#jvT-${who}-body`} />
      <use href={`#jvT-${who}-face-${expr}`} />
      <use href={`#jvT-${who}-arms-${expr}`} />
    </>
  );
}
