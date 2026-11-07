import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeCompanion, type HomeCompanionProps } from "./HomeCompanion";
import { DEFAULT_GOAL_SETTINGS, type Progress } from "@/lib/companion/goals";
import { localDayKey, type Ledger } from "@/lib/companion/ledger";

// Reduced motion keeps Rồng Con's reactions short and skips the timed opening, so these
// tests check what the page does rather than how long each beat lasts.
function reduceMotion(on: boolean) {
  window.matchMedia = ((query: string) => ({
    matches: on && query.includes("reduce"),
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}

const today = () => localDayKey(new Date());
const flags = (vocab = false, grammar = false, skills = false) => ({ vocab, grammar, skills });

function savedLedger(over: Partial<Ledger> = {}, xpBeforeToday = 0) {
  return {
    v: 3,
    day: today(),
    claims: flags(),
    xp: { vocab: 0, grammar: 0, skills: 0 },
    items: {},
    announced: flags(true),
    greeted: true,
    past: xpBeforeToday
      ? { "2000-1-1": { claims: flags(), xp: { vocab: xpBeforeToday, grammar: 0, skills: 0 }, items: {}, announced: flags(), greeted: true } }
      : {},
    ...over,
  };
}

function setup(opts: { progress?: Partial<Progress>; onboarded?: boolean; ledger?: unknown; hatchSeen?: boolean } = {}) {
  const onSaveLedger = vi.fn<HomeCompanionProps["onSaveLedger"]>();
  const onMarkProfile = vi.fn<HomeCompanionProps["onMarkProfile"]>();
  const props: HomeCompanionProps = {
    userId: "learner-1",
    settings: DEFAULT_GOAL_SETTINGS,
    progress: { vocab: 0, grammar: 0, skills: 0, ...opts.progress },
    progressDay: today(),
    savedLedger: opts.ledger === undefined ? savedLedger() : opts.ledger,
    profile: { onboarded: opts.onboarded ?? true, hatchSeen: opts.hatchSeen ?? false },
    onSaveLedger,
    onMarkProfile,
  };
  const view = render(<HomeCompanion {...props} />);
  return { ...view, props, onSaveLedger, onMarkProfile };
}

const vocabCheck = () => screen.getByRole("checkbox", { name: /Vocab SRS/ });
const lastLedger = (fn: ReturnType<typeof vi.fn<HomeCompanionProps["onSaveLedger"]>>) => fn.mock.calls.at(-1)![0];

beforeEach(() => {
  vi.useFakeTimers();
  reduceMotion(true);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("HomeCompanion", () => {
  it("keeps the Vocab goal locked until today's word target is met", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 2 } });
    expect(screen.getByText("2/5 words studied")).toBeTruthy();
    const check = vocabCheck();
    expect(check.getAttribute("aria-disabled")).toBe("true");
    expect(check.getAttribute("aria-label")).toBe("Vocab SRS: 2 of 5 words studied. Feeding unlocks at 5.");
    fireEvent.click(check);
    expect(lastLedger(onSaveLedger).claims.vocab).toBe(false);
  });

  it("feeds Rồng Con once the target is met and saves the claim and its XP", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 5 } });
    const check = vocabCheck();
    expect(check.getAttribute("aria-disabled")).toBe("false");
    expect(check.getAttribute("aria-label")).toBe("Feed Rồng Con: mark Vocab SRS complete for 10 XP");

    fireEvent.click(check);
    const saved = lastLedger(onSaveLedger);
    expect(saved.claims.vocab).toBe(true);
    expect(saved.xp.vocab).toBe(10);
    expect(saved.items.vocab).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(vocabCheck().getAttribute("aria-checked")).toBe("true");
    expect(screen.getByText(/\+10 XP earned/)).toBeTruthy();
    expect(screen.getByText("10 XP")).toBeTruthy();
  });

  it("takes the XP back when a goal is unticked", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 5 } });
    fireEvent.click(vocabCheck());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    fireEvent.click(vocabCheck());
    const saved = lastLedger(onSaveLedger);
    expect(saved.claims.vocab).toBe(false);
    expect(saved.xp.vocab).toBe(0);
  });

  it("shows a goal fed earlier today as fed, without saving anything new for it", () => {
    const ledger = savedLedger({ claims: flags(true), xp: { vocab: 10, grammar: 0, skills: 0 }, items: { vocab: "miquang" } });
    const { onSaveLedger } = setup({ progress: { vocab: 5 }, ledger });
    expect(vocabCheck().getAttribute("aria-checked")).toBe("true");
    const saved = lastLedger(onSaveLedger);
    expect(saved.claims.vocab).toBe(true);
    expect(saved.xp.vocab).toBe(10);
  });

  it("starts a first visit with the teachers' intro, and skipping it marks the learner onboarded", () => {
    const { onMarkProfile } = setup({ onboarded: false });
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getAllByText("Cô Tươi").length).toBeGreaterThan(0);
    expect(onMarkProfile).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    expect(onMarkProfile).toHaveBeenCalledWith({ onboarded: true });
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("shows a new learner Rồng Con's egg in the intro, and the dragon once it has hatched", () => {
    const { container, unmount } = setup({ onboarded: false });
    expect(container.querySelector(".guide-companion")!.classList.contains("is-egg")).toBe(true);
    expect(container.querySelector("#jvDragonArt > g")!.classList.contains("hatch-egg")).toBe(true);
    expect(screen.getByText(/still snug inside its egg/)).toBeTruthy();
    unmount();

    const hatched = setup({ onboarded: false, hatchSeen: true, ledger: savedLedger({}, 300) });
    expect(hatched.container.querySelector(".guide-companion")!.classList.contains("is-egg")).toBe(false);
    expect(hatched.container.querySelector("#jvDragonArt > g")!.classList.contains("hatch-hatched")).toBe(true);
    expect(screen.getByText(/help your companion grow/)).toBeTruthy();
  });

  it("does not show the intro to a learner who has seen it", () => {
    setup({ onboarded: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("marks the hatching as seen once the egg reaches 250 XP", () => {
    const { onMarkProfile } = setup({ progress: { vocab: 5 }, ledger: savedLedger({}, 240) });
    expect(onMarkProfile).not.toHaveBeenCalled();
    fireEvent.click(vocabCheck());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onMarkProfile).toHaveBeenCalledWith({ hatchSeen: true });
    expect(screen.getByText(/Baby Dragon · Stage 2/)).toBeTruthy();
  });

  it("starts today from a fresh ledger when the saved one is unreadable", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 0 }, ledger: { junk: true } });
    const saved = lastLedger(onSaveLedger);
    expect(saved.day).toBe(today());
    expect(saved.historyXp).toBe(0);
  });

  it("never saves during render: the first save goes out once Home has mounted", () => {
    const calls: string[] = [];
    const onSaveLedger = vi.fn(() => calls.push("save"));
    function Probe() {
      calls.push("render");
      return null;
    }
    render(
      <>
        <HomeCompanion
          userId="learner-1"
          settings={DEFAULT_GOAL_SETTINGS}
          progress={{ vocab: 0, grammar: 0, skills: 0 }}
          progressDay={today()}
          savedLedger={savedLedger()}
          profile={{ onboarded: true, hatchSeen: false }}
          onSaveLedger={onSaveLedger}
          onMarkProfile={vi.fn()}
        />
        <Probe />
      </>,
    );
    expect(calls[0]).toBe("render");
    expect(onSaveLedger).toHaveBeenCalled();
  });
});
