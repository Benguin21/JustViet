import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { HomeCompanion, type HomeCompanionProps } from "./HomeCompanion";
import { DEFAULT_GOAL_SETTINGS, type Progress } from "@/lib/companion/goals";
import { localDayKey, type Ledger } from "@/lib/companion/ledger";
import { HATCH_XP } from "@/lib/companion/growth";

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

function savedLedger(over: Partial<Ledger> = {}, xpBeforeToday = 0): Ledger {
  return {
    v: 4,
    day: today(),
    claims: flags(),
    xp: { vocab: 0, grammar: 0, skills: 0 },
    items: {},
    announced: flags(true),
    greeted: true,
    historyXp: xpBeforeToday,
    ...over,
  };
}
const totalOf = (l: unknown) => {
  const o = l as Partial<Ledger> | null;
  return o && o.v === 4 ? (o.historyXp ?? 0) + (o.xp ? o.xp.vocab + o.xp.grammar + o.xp.skills : 0) : 0;
};

function setup(
  opts: { progress?: Partial<Progress>; onboarded?: boolean; ledger?: unknown; levelSeen?: number; seenXp?: number | null } = {},
) {
  const onSaveLedger = vi.fn<HomeCompanionProps["onSaveLedger"]>();
  const onMarkProfile = vi.fn<HomeCompanionProps["onMarkProfile"]>();
  const props: HomeCompanionProps = {
    userId: "learner-1",
    settings: DEFAULT_GOAL_SETTINGS,
    progress: { vocab: 0, grammar: 0, skills: 0, ...opts.progress },
    progressDay: today(),
    savedLedger: opts.ledger === undefined ? savedLedger() : opts.ledger,
    // By default Home has already shown the saved total, so nothing is waiting to land.
    profile: {
      onboarded: opts.onboarded ?? true,
      levelSeen: opts.levelSeen ?? 1,
      seenXp: opts.seenXp === undefined ? totalOf(opts.ledger === undefined ? savedLedger() : opts.ledger) : opts.seenXp,
    },
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
    expect(screen.getByText("2/5 new words studied")).toBeTruthy();
    const check = vocabCheck();
    expect(check.getAttribute("aria-disabled")).toBe("true");
    expect(check.getAttribute("aria-label")).toBe("Vocab SRS: 2 of 5 new words studied. Feeding unlocks at 5.");
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
    expect(screen.getByText("+10 XP earned · Small goal")).toBeTruthy();
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
    const card = container.querySelector(".guide-companion")!;
    expect(card.classList.contains("is-egg")).toBe(true);
    // Just the whole egg: no cracks or peek in the intro.
    expect(card.querySelector("use")!.getAttribute("href")).toBe("#jvEggShell");
    expect(screen.getByText(/still snug inside its egg/)).toBeTruthy();
    unmount();

    const hatched = setup({ onboarded: false, levelSeen: 5, ledger: savedLedger({}, HATCH_XP + 50) });
    expect(hatched.container.querySelector(".guide-companion")!.classList.contains("is-egg")).toBe(false);
    expect(hatched.container.querySelector("#jvDragonArt > g")!.classList.contains("hatch-hatched")).toBe(true);
    expect(hatched.container.querySelector(".guide-companion use")!.getAttribute("href")).toBe("#jvDragonArt");
    expect(screen.getByText(/help your companion grow/)).toBeTruthy();
  });

  it("does not show the intro to a learner who has seen it", () => {
    setup({ onboarded: true });
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("hatches Rồng Con at Level 5 (700 XP) and marks it seen", () => {
    const { onMarkProfile } = setup({ progress: { vocab: 5 }, ledger: savedLedger({}, 690) });
    expect(screen.getByText("Level 4 · Hatching")).toBeTruthy();
    expect(screen.getByText("10 XP to Level 5")).toBeTruthy();
    expect(onMarkProfile).not.toHaveBeenCalledWith({ levelSeen: 5 });
    fireEvent.click(vocabCheck());
    act(() => {
      vi.advanceTimersByTime(30_000);
    });
    expect(onMarkProfile).toHaveBeenCalledWith({ levelSeen: 5 });
    expect(screen.getByText("Level 5 · Baby Dragon")).toBeTruthy();
    expect(screen.getByText("700 XP")).toBeTruthy();
  });

  it("shows the level, total XP and what's left to the next level", () => {
    setup({ ledger: savedLedger({}, 1312) });
    expect(screen.getByText("Level 7 · Baby Dragon")).toBeTruthy();
    expect(screen.getByText("1,312 XP")).toBeTruthy();
    expect(screen.getByText("144 XP to Level 8")).toBeTruthy();
    const bar = screen.getByRole("progressbar");
    expect(bar.getAttribute("aria-label")).toBe("Experience toward Level 8");
    expect(bar.getAttribute("aria-valuenow")).toBe("42");
  });

  it("handles Level 100 and XP past it", () => {
    setup({ ledger: savedLedger({}, 260000), levelSeen: 100 });
    expect(screen.getByText("Level 100 · Majestic Dragon")).toBeTruthy();
    expect(screen.getByText("260,000 XP")).toBeTruthy();
    expect(screen.getByText("Top level!")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("100");
  });

  it("shows XP earned elsewhere landing, with a level-up cue the first time a level is reached", () => {
    const { onMarkProfile } = setup({ ledger: savedLedger({}, 960), seenXp: 940, levelSeen: 5 });
    expect(screen.getByText("940 XP")).toBeTruthy();
    act(() => {
      vi.advanceTimersByTime(1_000);
    });
    expect(screen.getByText("960 XP")).toBeTruthy();
    expect(screen.getByText("Level 6 · Baby Dragon")).toBeTruthy();
    expect(screen.getByText("Level up! · Level 6")).toBeTruthy();
    expect(onMarkProfile).toHaveBeenCalledWith({ levelSeen: 6 });
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(onMarkProfile).toHaveBeenCalledWith({ seenXp: 960 });
  });

  it("doesn't celebrate a level again after XP dips below it and comes back", () => {
    const ledger = savedLedger({ claims: flags(true), xp: { vocab: 10, grammar: 0, skills: 0 }, items: { vocab: "miquang" } }, 950);
    setup({ progress: { vocab: 5 }, ledger, levelSeen: 6 });
    expect(screen.getByText("Level 6 · Baby Dragon")).toBeTruthy();
    fireEvent.click(vocabCheck());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Level 5 · Baby Dragon")).toBeTruthy();
    fireEvent.click(vocabCheck());
    act(() => {
      vi.advanceTimersByTime(10_000);
    });
    expect(screen.getByText("Level 6 · Baby Dragon")).toBeTruthy();
    expect(screen.queryByText(/Level up!/)).toBeNull();
  });

  it("pays a goal's bonus by the tier of today's target", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 18 } });
    // The default target is 5 words, a Small goal: +10 XP, however many more were studied.
    expect(screen.getByText("18/5 new words studied")).toBeTruthy();
    expect(screen.getByText("Ready to feed · +10 XP")).toBeTruthy();
    fireEvent.click(vocabCheck());
    expect(lastLedger(onSaveLedger).xp.vocab).toBe(10);
  });

  it("starts today from a fresh ledger when the saved one is unreadable", () => {
    const { onSaveLedger } = setup({ progress: { vocab: 0 }, ledger: { junk: true }, seenXp: 0 });
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
          profile={{ onboarded: true, levelSeen: 1, seenXp: 0 }}
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
