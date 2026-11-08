"use client";

/**
 * Rồng Con on Home: today's goal cards, the companion and its growth, and the teachers'
 * intro. Ported from the HomeDraft board on the JustViet design canvas
 * (https://claude.ai/artifact/5LFnFo85BXbFJk6swP39kQ), which is where its look and
 * choreography are designed and tested; HomeView is that board's markup.
 *
 * The goal rules (progress, eligibility, claims, the XP ledger) live in src/lib/companion and
 * know nothing about animation. This component only decides what to show and when: every XP
 * or goal change the page hasn't shown yet becomes a reaction (a meal, a progress change or
 * an untick), one plays at a time, and the page shows the recorded totals minus what is still
 * waiting to be shown, so its numbers always agree with the cards.
 *
 * Saving is the caller's job: the ledger and profile go out through onSaveLedger and
 * onMarkProfile, never from render.
 */
import { Component } from "react";
import { CHIPS, CRACKS, CRUMBS, FLAKES, LIFTS } from "@/lib/companion/crackTables";
import {
  GOAL_DEFS,
  GOAL_IDS,
  activeGoals,
  checkEligibility,
  goalBonus,
  sumXp,
  type GoalId,
  type GoalSettings,
  type PerGoal,
  type Progress,
} from "@/lib/companion/goals";
import { HATCH_XP, crackInk, crackProgress, evolutionFor, hatchFor, shellBitsFor } from "@/lib/companion/growth";
import { claimCount, ledgerForDay, settleLedger, type Ledger } from "@/lib/companion/ledger";
import { EAT_LINES, LINES, POKES, eatLine, moodFor, type Line, type LineKey } from "@/lib/companion/lines";
import { assignMenu, menuForDay, menuItem, thoughtFit, type MenuItem } from "@/lib/companion/menu";
import { hatchSeen, type CompanionProfile } from "@/lib/companion/profile";
import { dayKeyIn } from "@/lib/xp/day";
import { levelFor, levelProgress } from "@/lib/xp/levels";
import {
  CHEER_HOLD,
  CHEER_STILL,
  CLEAR_GAP,
  CLEAR_PAD,
  CONFETTI,
  EYES,
  FEED,
  FEED_TOP,
  GOAL_AIR,
  HATCH_FX,
  HATCH_ORDER,
  HERO_PAD,
  LIFT_GUARD,
  MOUTH,
  talkLiftPx,
  talkRestPx,
  type FeedMode,
  type LiftPhase,
  type Pose,
} from "./beats";
import { GUIDES, NAV, TEACHERS, guideSays, type GuideSet } from "./guides";
import { HomeView } from "./HomeView";
import "./companion.css";

export interface HomeCompanionProps {
  /** Picks the learner's own daily menu. */
  userId: string;
  /** Which goals are on, and today's target for each (locked for the day once a goal is active). */
  settings: GoalSettings;
  /** Today's verified progress per goal (vocab: new cards studied today). */
  progress: Progress;
  /** The local day `progress` was counted for (see dayKeyIn); after midnight it counts as 0. */
  progressDay: string;
  /** The learner's established time zone, which days are counted in (this device's when not given). */
  timeZone?: string;
  /** Today as Home opened it (see ledgerFromDay), or null. Only read when Home opens. */
  savedLedger: unknown;
  profile: CompanionProfile;
  onSaveLedger: (ledger: Ledger) => void;
  /** Only the profile fields that changed are passed (onboarded only turns on, levelSeen only goes up). */
  onMarkProfile: (changes: Partial<CompanionProfile>) => void;
}

/** XP still to show: per goal (its bonus), and `activity` for XP earned elsewhere (cards, lessons). */
type XpKey = GoalId | "activity";
type Dx = Partial<Record<XpKey, number>>;
type LineRef = LineKey | Line | null;
type HatchFx = "shake" | "crack" | "burst" | "pop" | "fade";
type Timer = ReturnType<typeof setTimeout>;

/** One thing for the page to show: a meal (a new claim), a progress change or an untick. */
interface Reaction {
  kind: "meal" | "progress" | "untick";
  goal?: GoalId;
  /** XP still to be shown, per goal. */
  dx: Dx;
  /** For a meal: an earlier change carried along, shown as it starts. */
  pre?: Dx;
  /** Goals fed still to be shown (1 for a meal until it has been eaten). */
  done: number;
  /** XP taken off at once (an untick), shown with this reaction's chip. */
  now?: number;
  ready?: boolean;
  tierUp?: boolean;
  quiet?: boolean;
  /** Nothing new cuts it short (the hatching, the all-fed celebration). */
  firm?: boolean;
  stopped?: boolean;
  started?: boolean;
}

interface State {
  ledger: Ledger;
  shownXp: number | null;
  shownDone: number | null;
  pose: Pose;
  line: LineRef;
  lineSeq: number;
  foodsShown: boolean;
  reduced: boolean;
  feeding: GoalId | null;
  waiting: Partial<Record<GoalId, boolean>>;
  feedKey: string | null;
  feedMode: FeedMode;
  feedSeq: number;
  feedTop: number;
  feedDx: number;
  feedDy: number;
  absorbing: boolean;
  sparkle: GoalId | null;
  celebrating: boolean;
  lift: LiftPhase | null;
  clear: number | null;
  room: number | null;
  over: number;
  nudge: "a" | "b" | null;
  chips: boolean;
  bursting: boolean;
  xpChip: { text: string; up: boolean } | null;
  xpChipSeq: number;
  /** The level-up cue on the growth card, while it shows. */
  levelUp: number | null;
  levelUpSeq: number;
  bumps: PerGoal<number>;
  hatchFx: HatchFx | null;
  guide: { set: GuideSet; step: number } | null;
  guideSeq: number;
  guideAnnounce: string;
}

type Patch = Partial<State>;
type Step = Patch | (() => void);
type Beat = readonly [number, Step];
type Opening = { kind: "intro" | "welcome" | "greeting" | "none"; ledger: Ledger; staticLine: LineKey | null };

/**
 * Only one opening plays when Home loads (see chooseOpening): GREETING on the first visit of
 * the day, or WELCOME_BACK when a goal has just become ready to feed. WELCOME_BACK wins when
 * both would apply. Evenly spaced beats, so each motion settles before the next one starts,
 * and each line stays up long enough to read both languages (~5 words a second).
 */
const GREETING: readonly Beat[] = [
  [600, { pose: "turn" }],
  [1400, { pose: "bow" }],
  [2200, { pose: "hello", line: "hello" }],
  [3700, { pose: "wants", line: "wants", foodsShown: true }],
  [7000, { pose: "ask", line: "ask" }],
  [10800, { pose: "idle", line: null }],
];
const WELCOME_BACK: readonly Beat[] = [
  [400, { pose: "hello", line: "ready", foodsShown: true }],
  [3900, { pose: "idle", line: null }],
];
/** After the intro Rồng Con takes the stage again with its daily hello (the cards are already up). */
const AFTER_INTRO: readonly Beat[] = [
  [500, { pose: "hello", line: "hello" }],
  [2000, { pose: "wants", line: "wants", foodsShown: true }],
  [5300, { pose: "ask", line: "ask" }],
  [9100, { pose: "idle", line: null }],
];
/** With no goals switched on there is no menu to show, so the greeting asks for goals. */
const NO_MENU_LINES: Partial<Record<LineKey, LineKey>> = { wants: "noMenu", ask: "setGoals" };
const RESET: Patch = {
  nudge: null,
  chips: false,
  bursting: false,
  sparkle: null,
  celebrating: false,
  feeding: null,
  absorbing: false,
  lift: null,
  clear: null,
  hatchFx: null,
};
const DEFAULT_USER = "demo-learner";
const NO_PROGRESS: Progress = { vocab: 0, grammar: 0, skills: 0 };
const C = 106.8; // circumference of the check ring (r=17)
/** How long the level-up cue stays on the growth card. */
const LEVEL_CUE_MS = 2800;

const fmt = (n: number) => n.toLocaleString("en-US");
const plural = (n: number, one: string, many: string) => (n === 1 ? one : many);
const isEatLine = (line: LineRef) => line === LINES.eat || Object.values(EAT_LINES).some((l) => l === line);

/** Per-goal XP differences between two recordings (only the goals that changed). */
function diffXp(was: PerGoal<number>, now: PerGoal<number>): Dx {
  const d: Dx = {};
  for (const id of GOAL_IDS) if ((now[id] || 0) !== (was[id] || 0)) d[id] = (now[id] || 0) - (was[id] || 0);
  return d;
}
function sumDx(d: Dx): number {
  let t = 0;
  for (const id of Object.keys(d) as XpKey[]) t += d[id] || 0;
  return t;
}
function inputsChanged(a: HomeCompanionProps, b: HomeCompanionProps): boolean {
  if (a.progressDay !== b.progressDay) return true;
  return GOAL_IDS.some(
    (id) =>
      a.progress[id] !== b.progress[id] ||
      a.settings.targets[id] !== b.settings.targets[id] ||
      a.settings.enabled[id] !== b.settings.enabled[id],
  );
}
function liftsIn(phase: LiftPhase | null, ...phases: LiftPhase[]): boolean {
  return !!phase && phases.includes(phase);
}

export type HomeVals = ReturnType<HomeCompanion["renderVals"]>;
export type HomeRefs = HomeCompanion["viewRefs"];

export class HomeCompanion extends Component<HomeCompanionProps, State> {
  timers: Timer[] = [];
  pokeIndex = 0;
  // Element refs for the feeding flight (from each goal's tile to Rồng Con).
  tileEls: Partial<Record<GoalId, HTMLElement | null>> = {};
  tileRefs: PerGoal<(el: HTMLElement | null) => void> = {
    vocab: (el) => void (this.tileEls.vocab = el),
    grammar: (el) => void (this.tileEls.grammar = el),
    skills: (el) => void (this.tileEls.skills = el),
  };
  watched = new WeakSet<HTMLElement>();
  dragonEl: HTMLElement | null = null;
  talkEl: HTMLElement | null = null;
  rootEl: HTMLElement | null = null;
  guideEl: HTMLElement | null = null;
  // Reactions (see reactions()): the one playing now and the ones waiting for it.
  cur: Reaction | null = null;
  queue: Reaction[] = [];
  busy = false;
  pendingXp: Reaction | null = null;
  chipTimer: Timer | undefined;
  levelTimer: Timer | undefined;
  freshTimer: Timer | undefined;
  chipFresh = false;
  nudgeFlip = false;
  nudgeTimer: Timer | undefined;
  liftGuard: Timer | undefined;
  afterLift: (() => void) | null = null;
  // The teacher guide card: what had focus before a modal guide opened, and the hatching's
  // card waiting for a quiet moment.
  guideFrom: HTMLElement | null = null;
  focusTimer: Timer | undefined;
  milestoneDue = false;
  milestoneTimer: Timer | undefined;
  inertOn: boolean | null = null;
  // What the learner has been through, and what to save once Home is on screen.
  profile: CompanionProfile;
  mounted = false;
  unsavedLedger: Ledger | null = null;
  unsavedProfile: Partial<CompanionProfile> = {};
  opening: Opening["kind"];
  // The opening's key line, until it has been said (a poke mid-opening replays it).
  openingLine: LineKey | null;
  lastProgress: Progress;
  lastActive: GoalId[];

  // The jump's end (jv-celebrate finishing) lets the dialogue settle back.
  dragonRef = (el: HTMLElement | null) => {
    this.dragonEl = el;
    if (!el || this.watched.has(el)) return;
    this.watched.add(el);
    el.addEventListener("animationend", (e) => {
      if (e.animationName === "jv-celebrate" && this.state.lift === "jump") this.liftDone("jump");
    });
  };
  // The dialogue's own transitions end its rise and its return.
  talkRef = (el: HTMLElement | null) => {
    this.talkEl = el;
    if (!el || this.watched.has(el)) return;
    this.watched.add(el);
    el.addEventListener("transitionend", (e) => {
      if (e.target !== el || e.propertyName !== "translate") return;
      if (this.state.lift === "rise") this.liftDone("rise");
      else if (this.state.lift === "ret") this.liftDone("ret");
    });
  };
  // The stage's clearance transitions end the clearance opening and closing.
  stageRef = (el: HTMLElement | null) => {
    if (!el || this.watched.has(el)) return;
    this.watched.add(el);
    el.addEventListener("transitionend", (e) => {
      if (e.target !== el || e.propertyName !== "margin-top") return;
      if (this.state.lift === "open") this.liftDone("open");
      else if (this.state.lift === "close") this.liftDone("close");
    });
  };
  guideRef = (el: HTMLElement | null) => {
    this.guideEl = el;
    if (!el || this.watched.has(el)) return;
    this.watched.add(el);
    el.addEventListener("keydown", (e) => this.guideKey(e));
  };
  rootRef = (el: HTMLElement | null) => {
    this.rootEl = el;
  };
  onResize = () => this.measureRoom();
  // Kept apart from renderVals(): the view attaches these, it never reads them.
  // Not `refs`: React resets a class component's `this.refs` when it mounts.
  viewRefs = {
    root: this.rootRef,
    talk: this.talkRef,
    stage: this.stageRef,
    dragon: this.dragonRef,
    guide: this.guideRef,
    tiles: this.tileRefs,
  };

  constructor(props: HomeCompanionProps) {
    super(props);
    let reduced = false;
    try {
      reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      reduced = false;
    }

    // Bring today's XP ledger in line with progress and claims, applying only the difference.
    const targets = props.settings.targets;
    const progress = this.progress();
    const active = this.active();
    const stored = ledgerForDay(props.savedLedger, this.today());
    const xpBefore = stored.historyXp + sumXp(stored.xp);
    const settled = settleLedger(stored, targets, progress, active);
    // A learner's very first visit starts with the teachers' intro. Rồng Con's own opening (and
    // any "Giỏi quá!") waits until it closes, so nothing talks over it.
    this.profile = { ...props.profile };
    const intro = !this.profile.onboarded;
    const opening: Opening = intro
      ? { kind: "intro", ledger: settled.ledger, staticLine: null }
      : this.chooseOpening(settled.ledger, targets, progress);
    const ledger = opening.ledger;
    this.pinFed(ledger);
    this.saveLedger(ledger);
    this.lastActive = active;

    let shownXp: number | null = null;
    // XP Home hasn't shown yet: what was earned elsewhere since it last showed the total (cards
    // studied, lessons done, a goal fed on another device), plus any bonus that changed on
    // settling. Keep drawing the egg and the level as they were, and show the change once the
    // opening is over.
    const seen = this.profile.seenXp ?? 0;
    const elsewhere = xpBefore - seen;
    if (settled.delta !== 0 || elsewhere !== 0) {
      shownXp = seen;
      const dx = diffXp(stored.xp, settled.ledger.xp);
      if (elsewhere) dx.activity = elsewhere;
      this.pendingXp = {
        kind: "progress",
        dx,
        done: 0,
        tierUp: settled.delta + elsewhere > 0,
        quiet: opening.kind !== "none",
      };
    }

    // Levels already shown (say an existing learner's): nothing to celebrate for them.
    const drawn = shownXp != null ? shownXp : ledger.historyXp + sumXp(ledger.xp);
    if (levelFor(drawn) > this.profile.levelSeen) this.markProfile({ levelSeen: levelFor(drawn) });

    const animate = !reduced && opening.kind !== "none" && !intro;
    this.opening = intro ? "intro" : reduced ? "none" : opening.kind;
    this.openingLine = animate ? opening.staticLine : null;
    this.lastProgress = progress;
    this.state = {
      ledger,
      shownXp,
      shownDone: null,
      pose: intro ? "intro" : animate && opening.kind === "greeting" ? "aside" : "idle",
      line: reduced ? opening.staticLine : null,
      lineSeq: 0,
      foodsShown: !(animate && opening.kind === "greeting"),
      reduced,
      feeding: null,
      waiting: {},
      feedKey: null,
      feedMode: "eat",
      feedSeq: 0,
      feedTop: FEED_TOP.eat,
      feedDx: 0,
      feedDy: -260,
      absorbing: false,
      sparkle: null,
      celebrating: false,
      lift: null,
      clear: null,
      room: null,
      over: 0,
      nudge: null,
      chips: false,
      bursting: false,
      xpChip: null,
      xpChipSeq: 0,
      levelUp: null,
      levelUpSeq: 0,
      bumps: { vocab: 0, grammar: 0, skills: 0 },
      hatchFx: null,
      guide: intro ? { set: "intro", step: 0 } : null,
      guideSeq: 0,
      guideAnnounce: "",
    };
  }

  // ----- Saving (never from render: what the constructor works out goes out on mount) -----
  saveLedger(l: Ledger) {
    if (this.mounted) this.props.onSaveLedger(l);
    else this.unsavedLedger = l;
  }
  markProfile(changes: Partial<CompanionProfile>) {
    const fresh: Partial<CompanionProfile> = {};
    if (changes.onboarded && !this.profile.onboarded) fresh.onboarded = true;
    if (changes.levelSeen != null && changes.levelSeen > this.profile.levelSeen) fresh.levelSeen = changes.levelSeen;
    if (changes.seenXp != null && changes.seenXp !== this.profile.seenXp) fresh.seenXp = changes.seenXp;
    if (!Object.keys(fresh).length) return;
    this.profile = { ...this.profile, ...fresh };
    if (this.mounted) this.props.onMarkProfile(fresh);
    else Object.assign(this.unsavedProfile, fresh);
  }
  // Once nothing is waiting to be shown: the levels shown so far have been seen, and the total
  // shown is the one to start from next time.
  syncSeen() {
    if (this.state.hatchFx || this.reactions().length || this.state.shownXp != null) return;
    const xp = this.totalXp();
    if (levelFor(xp) > this.profile.levelSeen) this.markProfile({ levelSeen: levelFor(xp) });
    if (xp !== this.profile.seenXp) this.markProfile({ seenXp: xp });
  }
  flushSaves() {
    if (this.unsavedLedger) this.props.onSaveLedger(this.unsavedLedger);
    if (Object.keys(this.unsavedProfile).length) this.props.onMarkProfile(this.unsavedProfile);
    this.unsavedLedger = null;
    this.unsavedProfile = {};
  }

  patch(p: Patch) {
    this.setState(p as State);
  }

  /**
   * Which single opening to play on load. A goal that just became ready to feed takes priority
   * over the first-visit greeting, and each plays once (a day, or per goal), not on every refresh.
   */
  chooseOpening(ledger: Ledger, targets: PerGoal<number>, progress: Progress): Opening {
    const ok = checkEligibility(targets, progress);
    const active = this.active();
    const l: Ledger = { ...ledger, announced: { ...ledger.announced } };
    const fresh = active.filter((id) => ok[id] && !l.claims[id] && !l.announced[id]);
    let kind: Opening["kind"] = "none";
    if (fresh.length) {
      kind = "welcome";
      for (const id of fresh) l.announced[id] = true;
      l.greeted = true;
    } else if (!l.greeted) {
      kind = "greeting";
      l.greeted = true;
    }
    const ask: LineKey = active.length ? "ask" : "setGoals";
    return { kind, ledger: l, staticLine: kind === "welcome" ? "ready" : kind === "greeting" ? ask : null };
  }

  /** The first-visit greeting, asking for goals instead when none are switched on. */
  greetingSteps(list: readonly Beat[] = GREETING): Beat[] {
    const none = !this.active().length;
    return list.map(([at, step]) => {
      if (none && typeof step !== "function" && typeof step.line === "string" && NO_MENU_LINES[step.line]) {
        return [at, { ...step, line: NO_MENU_LINES[step.line] }] as const;
      }
      return [at, step] as const;
    });
  }

  componentDidMount() {
    this.mounted = true;
    this.flushSaves();
    this.syncSeen();
    window.addEventListener("resize", this.onResize);
    this.measureRoom();
    this.syncInert();
    if (this.opening === "intro") this.openedGuide();
    else if (this.opening === "greeting") this.run(this.greetingSteps());
    else if (this.opening === "welcome") this.run(WELCOME_BACK.slice());
    else if (this.pendingXp) this.run([[this.state.line ? 3700 : 500, {}]]);
  }

  // The XP change saved up at mount. run() keeps it queued until it plays.
  playPending() {
    if (this.pendingXp) this.begin(this.pendingXp);
  }

  // ----- Teacher guide card -----
  guideModal(): boolean {
    const g = this.state.guide;
    return !!g && GUIDES[g.set].modal;
  }
  // While a modal guide is up, the page behind it can't be reached by keyboard or screen reader.
  syncInert() {
    this.setInert(this.guideModal());
  }
  setInert(on: boolean) {
    const root = this.rootEl;
    if (!root || this.inertOn === on) return;
    this.inertOn = on;
    const behind = [
      ...Array.from(root.children).filter((c) => c.tagName === "MAIN"),
      ...Array.from(document.querySelectorAll("header")),
    ];
    for (const el of behind) el.toggleAttribute("inert", on);
  }
  // Esc skips or closes; Tab stays inside a modal guide.
  guideKey(e: KeyboardEvent) {
    if (!this.state.guide) return;
    if (e.key === "Escape") {
      e.preventDefault();
      this.closeGuide();
      return;
    }
    if (e.key !== "Tab" || !this.guideModal() || !this.guideEl) return;
    const f = Array.from(this.guideEl.querySelectorAll<HTMLElement>("button, a[href]")).filter(
      (x) => x.getClientRects().length > 0 && getComputedStyle(x).visibility !== "hidden",
    );
    if (!f.length) return;
    const a = document.activeElement;
    if (e.shiftKey && (a === f[0] || a === this.guideEl)) {
      e.preventDefault();
      f[f.length - 1].focus();
    } else if (!e.shiftKey && a === f[f.length - 1]) {
      e.preventDefault();
      f[0].focus();
    }
  }
  // Keyboard focus goes to the guide's main button when it opens, and again whenever the
  // button that had it is gone (Back on the first step, Next turning into "Set Up My Goals").
  focusGuide(onlyIfLost: boolean) {
    clearTimeout(this.focusTimer);
    this.focusTimer = setTimeout(() => {
      const el = this.guideEl;
      if (!el || !this.guideModal()) return;
      const a = document.activeElement;
      if (onlyIfLost && a && a !== document.body && el.contains(a)) return;
      (el.querySelector<HTMLElement>(".guide-go") || el).focus({ preventScroll: true });
    }, 60);
  }
  openedGuide() {
    const a = document.activeElement;
    this.guideFrom = a instanceof HTMLElement && a !== document.body ? a : null;
    this.focusGuide(false);
  }
  // Next / Back. Past the last step, the guide is done.
  guideGo(dir: number) {
    const g = this.state.guide;
    if (!g) return;
    const steps = GUIDES[g.set].steps;
    const step = g.step + dir;
    if (step < 0) return;
    if (step >= steps.length) {
      this.closeGuide();
      return;
    }
    const st = steps[step];
    this.patch({
      guide: { set: g.set, step },
      guideSeq: this.state.guideSeq + (steps[g.step].who !== st.who ? 1 : 0),
      guideAnnounce: guideSays(st),
    });
    if (st.companion) this.introNudge();
    this.focusGuide(true);
  }
  // When the intro introduces Rồng Con, it gives a little wiggle (or a hop, once hatched): the
  // real one on the page and its live picture in the card alike.
  introNudge() {
    if (this.state.reduced) return;
    clearTimeout(this.nudgeTimer);
    this.nudgeFlip = !this.nudgeFlip;
    const hatched = hatchFor(this.drawnXp()).state === "hatched";
    this.patch(hatched ? { pose: "perk" } : { nudge: this.nudgeFlip ? "a" : "b" });
    this.nudgeTimer = setTimeout(() => {
      if (this.state.guide && this.state.guide.set === "intro") this.patch(hatched ? { pose: "intro" } : { nudge: null });
    }, 950);
  }
  // Done, skipped (Skip, "Maybe later", Esc) or "Set Up My Goals": either way the intro never
  // comes back by itself, not on a refresh, a new day or another device. Then Rồng Con's own
  // opening plays as on any first visit of the day: "Giỏi quá!" for a goal that just became
  // ready, else its daily hello.
  closeGuide() {
    const g = this.state.guide;
    if (!g) return;
    clearTimeout(this.nudgeTimer);
    clearTimeout(this.focusTimer);
    const from = this.guideFrom;
    this.guideFrom = null;
    if (g.set === "intro") {
      this.markProfile({ onboarded: true });
      const opening = this.chooseOpening(this.currentLedger(), this.props.settings.targets, this.progress());
      this.saveLedger(opening.ledger);
      const animate = !this.state.reduced;
      this.openingLine = animate ? opening.staticLine : null;
      this.patch({
        guide: null,
        guideAnnounce: "",
        ledger: opening.ledger,
        pose: "idle",
        nudge: null,
        foodsShown: true,
        line: animate ? null : opening.staticLine,
        lineSeq: this.state.lineSeq + 1,
      });
      if (animate && opening.kind === "welcome") this.run(WELCOME_BACK.slice());
      else if (animate && opening.kind === "greeting") this.run(this.greetingSteps(AFTER_INTRO));
      else if (this.pendingXp) this.run([[opening.staticLine ? 3700 : 500, {}]]);
    } else {
      this.patch({ guide: null, guideAnnounce: "" });
    }
    // Back to where the learner was (after the page behind is reachable again).
    if (from) {
      this.focusTimer = setTimeout(() => {
        if (from.isConnected) from.focus({ preventScroll: true });
      }, 30);
    }
  }
  // The hatching's card waits until Rồng Con has had its moment and nothing else is going on
  // (no meal, line, jump or other card), so it never talks over anything.
  maybeMilestone() {
    clearTimeout(this.milestoneTimer);
    if (!this.milestoneDue) return;
    const s = this.state;
    if (s.guide || this.busy || s.line || s.lift || s.feeding || s.hatchFx || s.celebrating) {
      this.milestoneTimer = setTimeout(() => this.maybeMilestone(), 500);
      return;
    }
    this.milestoneDue = false;
    this.patch({ guide: { set: "hatch", step: 0 }, guideSeq: s.guideSeq + 1, guideAnnounce: guideSays(GUIDES.hatch.steps[0]) });
  }
  stopMilestone() {
    clearTimeout(this.milestoneTimer);
    this.milestoneDue = false;
  }
  // A card that doesn't block the page (the hatching's) gives way when Rồng Con speaks again.
  dropCard() {
    if (this.state.guide && !this.guideModal()) this.patch({ guide: null, guideAnnounce: "" });
  }

  // ----- The one-time hatching -----
  // The XP has landed; the drawing keeps showing the egg (see drawnXp) while it shakes and
  // cracks, then it bursts, Rồng Con pops out and jumps for joy. Its timers are the reaction's own.
  reveal(step: Patch) {
    const F = HATCH_FX;
    if (this.state.reduced) {
      // Without motion the egg fades into the Baby Dragon, who says so; the card follows.
      this.markProfile({ levelSeen: levelFor(this.displayed().xp) });
      this.milestoneDue = true;
      Object.assign(step, { pose: "celebrate", hatchFx: "fade", line: LINES.hatched, sparkle: null } satisfies Patch);
      this.timers.push(setTimeout(() => this.apply({ hatchFx: null }), 1000));
      this.milestoneTimer = setTimeout(() => this.maybeMilestone(), CHEER_STILL + 400);
      return;
    }
    Object.assign(step, { hatchFx: "shake", pose: "hatching", line: null, sparkle: null, nudge: null, chips: false } satisfies Patch);
    this.timers.push(setTimeout(() => this.apply({ hatchFx: "crack" }), F.crack));
    this.timers.push(
      setTimeout(() => {
        // It has hatched: from here on it never plays again, even on a refresh.
        this.markProfile({ levelSeen: levelFor(this.displayed().xp) });
        this.milestoneDue = true;
        this.apply({ hatchFx: "burst", bursting: true, pose: "hello" });
      }, F.burst),
    );
    this.timers.push(
      setTimeout(() => {
        clearTimeout(this.liftGuard);
        this.liftGuard = setTimeout(() => this.liftDone("jump"), LIFT_GUARD.jump);
        this.apply({ pose: "celebrate", line: LINES.hatched, celebrating: true, lift: "jump" });
      }, F.cheer),
    );
    this.timers.push(setTimeout(() => this.apply({ bursting: false }), F.burst + 1300));
    this.milestoneTimer = setTimeout(() => this.maybeMilestone(), F.end + 600);
  }
  // The XP the drawing shows: while the hatching shakes and cracks it is still the egg.
  drawnXp(xp?: number): number {
    if (xp == null) xp = this.displayed().xp;
    const fx = this.state.hatchFx;
    return fx === "shake" || fx === "crack" ? Math.min(xp, HATCH_XP - 1) : xp;
  }

  componentDidUpdate(prevProps: HomeCompanionProps) {
    // After every render, before it is painted: how high the dialogue may go, then the next
    // step of a big jump once its line is up (or its size, for the hatching jump, which starts
    // straight away).
    this.measureRoom();
    if (this.state.lift === "prep") this.liftDone("prep");
    else if (this.state.lift === "jump" && this.state.clear == null) this.patch({ clear: this.clearFor() });
    this.syncInert();
    this.syncSeen();
    if (inputsChanged(this.props, prevProps)) this.syncProgress();
  }

  componentWillUnmount() {
    this.mounted = false;
    window.removeEventListener("resize", this.onResize);
    this.clearTimers();
    this.stopChip();
    clearTimeout(this.levelTimer);
    this.stopLift();
    this.stopMilestone();
    clearTimeout(this.focusTimer);
    clearTimeout(this.nudgeTimer);
    this.inertOn = true;
    this.setInert(false);
  }

  // How far the dialogue may rise without covering the goal cards: the gap above it plus the
  // room its zone leaves above the bubble, less GOAL_AIR (--room), kept from the last line while
  // no bubble shows. And how far a long line grows the zone past its usual height (over), for
  // the hero to give back. Measured after each render, before paint; it only re-renders when
  // one actually changes (a line of a different height, a resize).
  measureRoom() {
    const z = this.talkEl;
    if (!z || !z.parentElement) return;
    const col = z.parentElement;
    const above = col.previousElementSibling;
    const b = z.querySelector<HTMLElement>(".bubble");
    const next: Patch = {};
    const over = Math.max(0, Math.round(z.offsetHeight - (parseFloat(getComputedStyle(z).minHeight) || 0)));
    if (over !== this.state.over) next.over = over;
    if (above && b) {
      const room = Math.max(
        0,
        Math.floor(col.getBoundingClientRect().top - above.getBoundingClientRect().bottom + z.offsetHeight - b.offsetHeight - GOAL_AIR),
      );
      if (room !== this.state.room) next.room = room;
    }
    if (next.over != null || next.room != null) this.patch(next);
  }
  // The dialogue's offsets as drawn: resting, and for a big jump.
  talkNumbers() {
    const s = this.state;
    const xp = this.drawnXp(s.shownXp != null ? s.shownXp : this.totalXp());
    const done = s.shownDone != null ? s.shownDone : this.doneCount();
    const hatchState = hatchFor(xp).state;
    const scale = this.dragonScale(done, xp);
    const rest = talkRestPx(hatchState, scale, false, s.reduced);
    return { rest, lift: Math.max(rest, talkLiftPx(hatchState, scale)) };
  }
  // The clearance a big jump needs: whatever it needs beyond the room under the cards.
  clearFor(): number {
    const room = this.state.room != null ? this.state.room : 999;
    return Math.min(CLEAR_PAD + CLEAR_GAP, Math.max(0, this.talkNumbers().lift - room));
  }
  // Whether the dialogue moves when it goes up (or back): not if it already sits as high as
  // the room allows.
  talkMoves(clear: number): boolean {
    const t = this.talkNumbers();
    const room = this.state.room != null ? this.state.room : 999;
    return Math.min(t.lift - clear, room) !== Math.min(t.rest, room);
  }

  // A big jump's phases (Rồng Con waits until 'jump'): 'prep' (the line is up), 'open' (the
  // clearance opens, if the jump needs one), 'held' (opened at the last meal, waiting for the
  // celebration), 'rise' (the dialogue moves up), 'jump' (Rồng Con jumps and lands, the
  // dialogue stays put), 'ret' (the dialogue settles back), 'close' (the clearance closes),
  // then null. (extra: state that changes in the same render, so the jump is held from its
  // first frame.)
  setLift(phase: LiftPhase | null, extra?: Patch | null) {
    clearTimeout(this.liftGuard);
    const guard = phase ? LIFT_GUARD[phase] : undefined;
    if (phase && guard) this.liftGuard = setTimeout(() => this.liftDone(phase), guard);
    this.apply({ lift: phase, ...extra });
  }
  // The phase that just ended, by its own event or by its guard.
  liftDone(phase: LiftPhase) {
    if (this.state.lift !== phase) return;
    const clear = this.state.clear || 0;
    if (phase === "prep") {
      const need = this.clearFor();
      if (need !== clear) this.setLift("open", { clear: need });
      else this.opened(need);
    } else if (phase === "open") {
      this.opened(clear);
    } else if (phase === "rise") {
      this.setLift("jump");
    } else if (phase === "jump") {
      // The all-fed "No quá!" ends with the jump: it goes as Rồng Con lands.
      const landed: Patch | null = this.state.line === LINES.celebrate ? { line: null } : null;
      if (this.talkMoves(clear)) this.setLift("ret", landed);
      else if (clear > 0) this.setLift("close", landed);
      else {
        if (landed) this.apply(landed);
        this.endLift();
      }
    } else if (phase === "ret") {
      if (clear > 0) this.setLift("close");
      else this.endLift();
    } else {
      this.endLift();
    }
  }
  // The clearance is the size the jump needs: wait there for the celebration if it opened
  // early (or let go, if none was needed), else on to the dialogue's rise, or straight to the
  // jump if the dialogue already sits as high as it may.
  opened(clear: number) {
    if (this.state.pose !== "celebrate") {
      if (clear > 0) this.setLift("held");
      else this.endLift();
    } else {
      this.setLift(this.talkMoves(clear) ? "rise" : "jump", { clear });
    }
  }
  endLift() {
    this.setLift(null, { clear: null });
    const after = this.afterLift;
    this.afterLift = null;
    if (after) after();
  }
  // Anything that cuts a jump short also lets the dialogue go and closes the clearance, so
  // neither can stay open.
  stopLift() {
    clearTimeout(this.liftGuard);
    this.afterLift = null;
    if (this.state.lift || this.state.clear != null) this.patch({ lift: null, clear: null });
  }

  clearTimers() {
    for (const t of this.timers) clearTimeout(t);
    this.timers = [];
  }

  // Each step: [ms, stateChanges | function].
  run(steps: Beat[]) {
    this.clearTimers();
    if (this.pendingXp) {
      const last = steps.reduce((m, st) => Math.max(m, st[0]), 0);
      steps = steps.concat([[last + 200, () => this.playPending()]]);
    }
    for (const [at, step] of steps) this.timers.push(setTimeout(() => this.apply(step), at));
  }

  apply(step: Step) {
    if (typeof step === "function") {
      step();
      return;
    }
    if (step.line && step.line === this.openingLine) this.openingLine = null;
    const next: Patch = { ...step };
    if ("line" in step) next.lineSeq = this.state.lineSeq + 1;
    if (step.xpChip && !("xpChipSeq" in step)) next.xpChipSeq = this.state.xpChipSeq + 1;
    this.patch(next);
  }

  active(): GoalId[] {
    return activeGoals(this.props.settings);
  }
  // Today, in the learner's established time zone.
  today(): string {
    return dayKeyIn(Date.now(), this.props.timeZone);
  }
  progress(): Progress {
    return this.props.progressDay === this.today() ? this.props.progress : NO_PROGRESS;
  }
  // Today's ledger. A page left open past midnight starts the new day with the next change.
  currentLedger(): Ledger {
    return ledgerForDay(this.state.ledger, this.today());
  }
  baseXp(ledger?: Ledger): number {
    return (ledger || this.state.ledger).historyXp;
  }
  // The XP total is what the ledger has recorded, never a running count of clicks.
  totalXp(): number {
    return this.baseXp() + sumXp(this.state.ledger.xp);
  }
  doneCount(): number {
    return claimCount(this.state.ledger, this.active());
  }
  // What the page shows now (see held()): the XP drawn in the egg and panel, and the goals fed
  // (mood, count, the dragon's size), which catch up as reactions land.
  displayed(): { xp: number; done: number } {
    const s = this.state;
    return { xp: s.shownXp != null ? s.shownXp : this.totalXp(), done: s.shownDone != null ? s.shownDone : this.doneCount() };
  }
  userId(): string {
    return String(this.props.userId || "").trim() || DEFAULT_USER;
  }
  // Today's dish for each active goal. The menu follows the ledger's day, so a page left open
  // past midnight keeps the menu that matches what it shows until the next action moves it on.
  menuFor(ledger: Ledger): Partial<Record<GoalId, MenuItem>> {
    return assignMenu(menuForDay(this.userId(), ledger.day || this.today()), this.active(), ledger.items);
  }
  menu() {
    return this.menuFor(this.state.ledger);
  }
  // A goal fed today keeps its dish for the rest of the day, even if it's unticked, so a change
  // in Goals never swaps it.
  pinFed(l: Ledger) {
    const m = this.menuFor(l);
    for (const id of this.active()) {
      const it = m[id];
      if (l.claims[id] && !l.items[id] && it) l.items[id] = it.key;
    }
  }
  // Once hatched, Rồng Con grows a little with each goal fed today. Through Hatching the egg
  // keeps one size whatever is fed: only its cracks, hole and shell show progress.
  dragonScale(done: number, xp: number): number {
    return hatchFor(xp).state === "hatched" ? 1 + 0.06 * done : 1;
  }
  // Where the flying item lands in the dragon button: FEED_TOP moved by the dragon's scale (it
  // grows from its feet, 50% 92%, with each goal fed once hatched).
  feedTopFor(mode: FeedMode): number {
    const d = this.displayed();
    const s = this.dragonScale(d.done, d.xp);
    return Math.round(230 + (FEED_TOP[mode] + 22 - 230) * s - 22);
  }
  // Where the claimed item starts its flight: its own tile, measured from where it lands.
  flightFrom(id: GoalId, top: number): { dx: number; dy: number } {
    const tile = this.tileEls[id];
    const dragon = this.dragonEl;
    if (!tile || !dragon) return { dx: 0, dy: -260 };
    const a = tile.getBoundingClientRect();
    const b = dragon.getBoundingClientRect();
    return {
      dx: Math.round(a.left + a.width / 2 - (b.left + 110)),
      dy: Math.round(a.top + a.height / 2 - (b.top + top + 22)),
    };
  }

  // Progress or targets changed while Home is open: re-settle the ledger, then react to what
  // actually changed (a goal newly ready to feed, or a vocab tier reached).
  syncProgress() {
    const targets = this.props.settings.targets;
    const progress = this.progress();
    const active = this.active();
    const ledger = this.currentLedger();
    const xpWas = { ...ledger.xp };
    const claimsWas = { ...ledger.claims };
    const l = settleLedger(ledger, targets, progress, active).ledger;
    this.pinFed(l);
    const ok = checkEligibility(targets, progress);
    // While the intro is up nothing is announced yet: its "Giỏi quá!" comes once the intro closes.
    const introUp = !!(this.state.guide && this.state.guide.set === "intro");
    const fresh = introUp ? [] : active.filter((id) => ok[id] && !l.claims[id] && !l.announced[id]);
    for (const id of fresh) l.announced[id] = true;
    if (fresh.length) l.greeted = true;
    this.saveLedger(l);

    const bumps = { ...this.state.bumps };
    const last = this.lastProgress || progress;
    for (const id of GOAL_IDS) if (progress[id] !== last[id]) bumps[id] += 1;
    this.lastProgress = progress;

    // A claim that lost its eligibility (say the target was raised) goes like an untick: what
    // was shown for it comes off at once, and its meal stops if it was on its way.
    const voided = GOAL_IDS.filter((id) => claimsWas[id] && !l.claims[id]);
    let taken = 0;
    let stopped = false;
    for (const id of voided) {
      taken -= this.shownFor(id, xpWas);
      if (this.forget(id)) stopped = true;
    }
    // A goal switched off in Goals leaves Home but keeps its claim and XP. If its item was
    // still on its way to Rồng Con, the meal stops and its XP lands without it.
    const off = (this.lastActive || active).filter((id) => !active.includes(id));
    this.lastActive = active;
    const offDx: Dx = {};
    for (const id of off) {
      const left = (l.xp[id] || 0) - this.shownFor(id, l.xp);
      if (this.forget(id)) stopped = true;
      if (left) offDx[id] = left;
    }
    if (this.reconcile(l)) stopped = true;
    // XP changes for goals still fed (a vocab tier reached or lost, or one that changed while
    // its goal was switched off) get their own reaction.
    const dx: Dx = {};
    for (const id of active) if (l.claims[id] && l.xp[id] !== xpWas[id]) dx[id] = l.xp[id] - xpWas[id];
    const tierUp = sumDx(dx) > 0 && !fresh.length;
    for (const id of Object.keys(offDx) as GoalId[]) dx[id] = (dx[id] || 0) + (offDx[id] || 0);
    let r: Reaction | null = null;
    if (Object.keys(dx).length || fresh.length) {
      // Anything still waiting from the load is shown along with it.
      if (this.pendingXp) {
        const held = this.pendingXp.dx;
        for (const id of Object.keys(held) as XpKey[]) dx[id] = (dx[id] || 0) + (held[id] || 0);
        this.pendingXp = null;
      }
      r = { kind: "progress", dx, done: 0, ready: fresh.length > 0, tierUp };
    } else if (taken || stopped) {
      r = { kind: "progress", dx: {}, done: 0 };
    }
    if (r && introUp) {
      // Nothing reacts behind the intro: the change waits and plays after Rồng Con's opening.
      const hold: Reaction = this.pendingXp || { kind: "progress", dx: {}, done: 0, quiet: true };
      for (const id of Object.keys(r.dx) as XpKey[]) hold.dx[id] = (hold.dx[id] || 0) + (r.dx[id] || 0);
      hold.tierUp = sumDx(hold.dx) > 0;
      this.pendingXp = this.isEmpty(hold) ? null : hold;
      r = null;
    }
    let extra: Patch = {};
    if (r) {
      this.openingLine = null;
      r.now = taken;
      const quick = !Object.keys(r.dx).length && !r.ready;
      if (stopped || (quick ? !this.showing() : !this.waits(r))) this.begin(r);
      else {
        // Something is being shown: take the XP off now, and react to the rest after it.
        extra = this.chip(taken);
        r.now = 0;
        const tail = this.queue[this.queue.length - 1];
        if (quick) r = null;
        else if (tail && tail.kind === "progress") {
          // Two progress changes in a row (say 5 → 10 → 16 words) make one reaction.
          for (const id of Object.keys(r.dx) as XpKey[]) tail.dx[id] = (tail.dx[id] || 0) + (r.dx[id] || 0);
          tail.ready = tail.ready || r.ready;
          tail.tierUp = sumDx(tail.dx) > 0 && !tail.ready;
        } else this.queue.push(r);
      }
    }
    this.patch({ ledger: l, bumps, foodsShown: true, waiting: this.stillWaiting(l), ...this.held(l), ...extra });
  }

  // Tick an eligible goal to feed Rồng Con, or untick it. The XP follows from the ledger:
  // claiming adds the goal's current entitlement, unclaiming takes it all back.
  toggle(id: GoalId) {
    const targets = this.props.settings.targets;
    const progress = this.progress();
    const ok = checkEligibility(targets, progress);
    // Act on what this page shows, then write it onto today's ledger.
    const shown = this.state.ledger;
    if (!this.active().includes(id)) return; // its goal is switched off in Goals
    const want = !(shown.day === this.today() && !!shown.claims[id] && ok[id]);
    if (want && !ok[id]) return; // feeding unlocks once the daily target is met
    const ledger = this.currentLedger();
    const xpWas = { ...ledger.xp };
    ledger.claims[id] = want;
    // Rồng Con eats the dish on the card, and the goal keeps it for the rest of the day.
    if (want) {
      ledger.announced[id] = true;
      ledger.greeted = true;
      const dish = this.menuFor(ledger)[id];
      if (dish) ledger.items[id] = dish.key;
    }
    const l = settleLedger(ledger, targets, progress, this.active()).ledger;
    this.saveLedger(l);
    const bumps = { ...this.state.bumps };
    bumps[id] += 1;
    this.openingLine = null;
    let extra: Patch = {};
    if (want) {
      // A meal on its way for a goal this ledger no longer claims (a new day has started) stops first.
      if (this.reconcile(l)) this.begin({ kind: "progress", dx: {}, done: 0 });
      // The item stays full on its card until Rồng Con has eaten it (see stillWaiting).
      const meal: Reaction = { kind: "meal", goal: id, dx: diffXp(xpWas, l.xp), done: 1 };
      if (this.waits(meal)) this.queue.push(meal);
      else this.begin(meal);
    } else {
      // Unticking takes back what was shown for it and drops what wasn't shown yet.
      const r: Reaction = { kind: "untick", goal: id, dx: {}, done: 0, now: -this.shownFor(id, xpWas) };
      let stopped = this.forget(id);
      if (this.reconcile(l)) stopped = true;
      if (stopped || !this.showing()) this.begin(r);
      else extra = this.chip(r.now || 0); // another item is on its way: just the chip
    }
    this.patch({ ledger: l, bumps, foodsShown: true, waiting: this.stillWaiting(l), ...this.held(l), ...extra });
  }

  // ----- Reactions -----
  // Every XP or goal change the page hasn't shown yet belongs to one. One plays at a time and
  // the rest wait in this.queue, so every item is seen being eaten and every XP change gets
  // its own chip.
  reactions(): Reaction[] {
    return [this.pendingXp, this.cur, ...this.queue].filter((r): r is Reaction => !!r);
  }
  held(ledger: Ledger): { shownXp: number | null; shownDone: number | null } {
    let xp = 0;
    let done = 0;
    for (const r of this.reactions()) {
      xp += sumDx(r.dx) + sumDx(r.pre || {});
      if (r.kind !== "meal" || (r.goal && ledger.claims[r.goal])) done += r.done;
    }
    return {
      shownXp: xp ? this.baseXp(ledger) + sumXp(ledger.xp) - xp : null,
      shownDone: done ? claimCount(ledger, this.active()) - done : null,
    };
  }
  // Claimed items whose meal hasn't started yet stay full on their cards.
  stillWaiting(ledger: Ledger): Partial<Record<GoalId, boolean>> {
    const w: Partial<Record<GoalId, boolean>> = {};
    for (const r of this.queue) if (r.kind === "meal" && r.goal && ledger.claims[r.goal]) w[r.goal] = true;
    const cur = this.cur;
    // The meal about to start keeps its item until its first step takes over.
    if (cur && cur.kind === "meal" && cur.goal && cur.done && !cur.started && ledger.claims[cur.goal]) w[cur.goal] = true;
    return w;
  }
  // The XP recorded for a goal that the page has already shown.
  shownFor(id: GoalId, xp: PerGoal<number>): number {
    let waiting = 0;
    for (const r of this.reactions()) waiting += (r.dx[id] || 0) + ((r.pre || {})[id] || 0);
    return (xp[id] || 0) - waiting;
  }
  // Goal `id` was unticked or lost its claim: drop whatever was still waiting to be shown for
  // it (its meal, a tier change). True when its meal was the one on its way.
  forget(id: GoalId): boolean {
    for (const r of this.reactions()) {
      delete r.dx[id];
      if (r.pre) delete r.pre[id];
    }
    if (this.pendingXp && this.isEmpty(this.pendingXp)) this.pendingXp = null;
    this.queue = this.queue.filter((r) => !(r.kind === "meal" && r.goal === id) && !this.isEmpty(r));
    const cur = this.cur;
    if (cur && cur.kind === "meal" && cur.goal === id && !cur.stopped) {
      cur.done = 0;
      cur.firm = false;
      cur.stopped = true;
      return true;
    }
    return false;
  }
  // Meals for goals the ledger no longer claims have nothing left to feed. After midnight
  // nothing from yesterday is left to show either: its XP is in the history now. True when the
  // meal on its way was dropped.
  reconcile(l: Ledger): boolean {
    let stopped = false;
    const newDay = l.day !== this.state.ledger.day;
    for (const r of this.reactions()) {
      if (r.kind === "meal" && r.goal && !r.stopped && (newDay || !l.claims[r.goal]) && this.forget(r.goal)) stopped = true;
    }
    if (newDay) for (const id of GOAL_IDS) this.forget(id);
    return stopped;
  }
  isEmpty(r: Reaction): boolean {
    return r.kind === "progress" && !r.ready && !r.now && !Object.keys(r.dx).length;
  }
  // The reaction playing now still has something to show (an item on its way).
  showing(): boolean {
    const r = this.cur;
    return !!r && (r.done > 0 || Object.keys(r.dx).length > 0 || Object.keys(r.pre || {}).length > 0);
  }
  // A new reaction waits its turn while something is being shown, during the all-fed
  // celebration, or behind others already waiting; a progress change also lets a meal's happy
  // reaction be read first. A reaction that is only talking is cut short instead, so a tap
  // never waits on a speech bubble.
  waits(r: Reaction): boolean {
    const cur = this.cur;
    if (this.showing() || this.queue.length > 0) return true;
    if (!cur || cur.stopped) return false;
    return !!cur.firm || (cur.kind === "meal" && r.kind !== "meal");
  }

  // Start a reaction now (cutting short whatever is only talking).
  begin(r: Reaction) {
    this.clearTimers();
    this.stopLift();
    this.dropCard();
    if (this.state.hatchFx) this.patch({ hatchFx: null, bursting: false, celebrating: false });
    // Whatever the reaction cut short, or the change saved up at load, hasn't been shown yet: it
    // goes with this one, so its XP lands (and can hatch the egg) in its place. A meal shows such
    // an earlier change as it starts (r.pre), and its own once eaten.
    const meal = r.kind === "meal";
    if (meal && !r.pre) r.pre = {};
    const into = meal ? (r.pre as Dx) : r.dx;
    for (const prev of [this.cur, this.pendingXp]) {
      if (!prev || prev === r) continue;
      for (const d of [prev.dx, prev.pre || {}]) {
        for (const id of Object.keys(d) as XpKey[]) into[id] = (into[id] || 0) + (d[id] || 0);
      }
      prev.dx = {};
      prev.pre = {};
      r.now = (r.now || 0) + (prev.now || 0);
      prev.now = 0;
    }
    this.pendingXp = null;
    this.cur = r;
    this.busy = true;
    // The state set above may not have landed yet: start on the next tick.
    this.timers.push(setTimeout(() => this.playNow(r), 0));
  }

  // A reaction has had its moment: play the next one waiting, if any.
  finish(r: Reaction) {
    if (this.cur !== r) return;
    this.cur = null;
    const next = this.queue.shift();
    if (next) this.begin(next);
    else this.busy = false;
  }

  // The XP chip shows a real change in recorded XP, and nothing when it is zero. It has its own
  // timers, so the next reaction can't cut it short, and a meal's chip waits until a chip that
  // just went up has been read (chipFresh).
  chip(change: number): Patch {
    if (!change) return {};
    this.stopChip();
    this.chipFresh = true;
    this.freshTimer = setTimeout(() => {
      this.chipFresh = false;
    }, 600);
    this.chipTimer = setTimeout(() => {
      this.chipTimer = undefined;
      this.patch({ xpChip: null });
    }, 1700);
    return { xpChip: { text: (change > 0 ? "+" : "−") + Math.abs(change) + " XP", up: change > 0 }, xpChipSeq: this.state.xpChipSeq + 1 };
  }
  stopChip() {
    clearTimeout(this.chipTimer);
    clearTimeout(this.freshTimer);
    this.chipFresh = false;
  }
  // The level-up cue: "Level up! · Level 6" on the growth card for a moment. Its own timer, so
  // the next reaction can't cut it short.
  levelCue(level: number): Patch {
    clearTimeout(this.levelTimer);
    this.levelTimer = setTimeout(() => this.patch({ levelUp: null }), LEVEL_CUE_MS);
    return { levelUp: level, levelUpSeq: this.state.levelUpSeq + 1 };
  }

  playNow(r: Reaction) {
    if (this.cur !== r) return;
    const s = this.state;
    const fed = r.kind === "meal" && r.goal ? r.goal : null;
    // Start from what the page shows now; this reaction adds what it was holding back.
    const shown = this.displayed();
    const pre = sumDx(r.pre || {});
    const gain = sumDx(r.dx) + pre;
    const doneAfter = shown.done + r.done;
    const lastMeal = !!fed && doneAfter === this.active().length && shown.done < doneAfter;
    const hBefore = hatchFor(shown.xp).state;
    // Plan for the shell breaking (land() decides for sure, when the XP lands).
    const hatching = hatchFor(shown.xp + gain).state === "hatched" && hBefore !== "hatched";
    // The first time, hatching is the whole reveal (HATCH_FX), which nothing new cuts short. If
    // the XP dips and comes back later, Rồng Con just pops back out: no second celebration.
    const reveal = hatching && !hatchSeen(this.profile);
    // XP from studying elsewhere, and whether it reaches a level not celebrated yet.
    const studied = (r.dx.activity || 0) + ((r.pre || {}).activity || 0) > 0;
    const levelled = levelFor(shown.xp + gain) > Math.max(levelFor(shown.xp), this.profile.levelSeen);
    const H = reveal && !s.reduced ? HATCH_FX.end : 2200;
    if (reveal) r.firm = true;
    // With reduced motion nothing flies, so there's nothing to wait for.
    const B = s.reduced ? { arrive: 0, swallow: 0, settle: 0, react: FEED.react, next: 0 } : FEED;
    // Show this reaction's XP with its chip. The egg is released: crack, hole and shell edge
    // animate to the new XP, and if that hatches it, the shell breaks right then. Decided as it
    // lands, since an untick may have moved the XP since the start.
    const land = (extra: Patch, part: "dx" | "pre" = "dx") => {
      const go = () => {
        // A chip that just went up (say an untick's) gets read before a meal's replaces it.
        if (fed && part === "dx" && this.chipFresh && sumDx(r.dx)) {
          this.timers.push(setTimeout(go, 100));
          return;
        }
        const from = this.displayed().xp;
        const add = sumDx(r[part] || {});
        const hb = hatchFor(from).state;
        const ha = hatchFor(from + add).state;
        const step: Patch = { ...extra };
        const hatches = ha === "hatched" && hb !== "hatched";
        if (hatches) {
          if (!hatchSeen(this.profile)) this.reveal(step);
          else {
            Object.assign(step, { pose: "perk", hatchFx: "pop", sparkle: null } satisfies Patch);
            this.timers.push(setTimeout(() => this.apply({ hatchFx: null }), 900));
          }
        } else if (add > 0) {
          this.nudgeFlip = !this.nudgeFlip;
          step.nudge = this.nudgeFlip ? "a" : "b";
          step.chips = HATCH_ORDER[ha] > HATCH_ORDER[hb];
          this.timers.push(setTimeout(() => this.apply({ nudge: null, chips: false }), 950));
        }
        // A level reached for the first time gets its little cue on the growth card. (The
        // hatching, Level 5, marks itself seen once the shell has burst.)
        const lv = levelFor(from + add);
        if (lv > levelFor(from) && lv > this.profile.levelSeen) {
          Object.assign(step, this.levelCue(lv));
          if (!hatches) this.markProfile({ levelSeen: lv });
        }
        const chip = this.chip(add + (r.now || 0));
        r[part] = {};
        r.now = 0;
        this.apply({ ...step, ...this.held(this.state.ledger), ...chip });
      };
      return go;
    };
    const steps: Beat[] = [];
    let t = 0;
    let next = 0;
    let lineAt = -1;
    let cheer = false;
    // A new claim is fed to Rồng Con first; the XP shows up once it has been swallowed.
    const at = fed ? B.swallow : 0;

    if (fed) {
      // Rồng Con is just as happy to eat when the reward is 0 XP.
      const item = this.menu()[fed] || menuItem(this.state.ledger.items[fed]) || { key: "none" };
      const hStart = hatchFor(shown.xp + pre).state;
      const canEat = hStart === "hatched";
      const mode: FeedMode = canEat ? "eat" : "absorb";
      const top = this.feedTopFor(mode);
      const from = this.flightFrom(fed, top);
      const seq = s.feedSeq + 1;
      steps.push([
        0,
        () => {
          r.started = true;
          const start: Patch = {
            feeding: fed,
            waiting: this.stillWaiting(this.state.ledger),
            feedKey: item.key,
            feedMode: mode,
            feedSeq: seq,
            feedTop: top,
            feedDx: from.dx,
            feedDy: from.dy,
            absorbing: false,
            bursting: false,
            celebrating: false,
            pose: canEat ? "hello" : "bow",
            sparkle: fed,
          };
          // Keep the meal before's happy line up; clear anything else.
          if (!isEatLine(this.state.line)) start.line = null;
          this.apply(start);
        },
      ]);
      // An earlier change carried along (say the one saved at load) shows as it starts.
      if (pre || r.now) steps.push([0, land({}, "pre")]);
      steps.push([B.arrive, canEat ? { pose: "eat" } : { pose: "eat", absorbing: true }]);
      steps.push([at, land({})]);
      // Eaten: the card's item turns into its finished drawing, and a happy hop
      // (unless the shell is still breaking, which is its own celebration).
      steps.push([
        B.settle,
        () => {
          r.done = 0;
          const step: Patch = { feeding: null, absorbing: false };
          if (!this.state.bursting && !this.state.hatchFx) Object.assign(step, { pose: "perk", line: eatLine(item), sparkle: null } satisfies Patch);
          Object.assign(step, this.held(this.state.ledger));
          if (lastMeal && !this.state.bursting && !this.state.hatchFx && !this.state.reduced && this.doneCount() === this.active().length) this.setLift("prep", step);
          else this.apply(step);
        },
      ]);
      t = Math.max(B.settle + B.react, hatching ? at + H : 0);
      next = Math.max(B.next, hatching ? at + H : 0);
      // The next meal can start now (it keeps the "Ngon quá!" up); anything else lets the happy
      // reaction be read first.
      steps.push([
        next,
        () => {
          if (this.queue.length && this.queue[0].kind === "meal") this.finish(r);
        },
      ]);
      next = Math.max(next, B.settle + 900);
    } else {
      steps.push([0, land({ feeding: null, absorbing: false })]);
      if (hatching) t = H;
      if (r.kind === "untick") {
        // Unticking takes the XP back but never plays the meal in reverse.
        steps.push([t, { pose: "perk", line: LINES.oops, sparkle: null }]);
        lineAt = t;
        t += 1500;
      } else if (r.ready) {
        steps.push([t, { pose: "hello", line: LINES.ready, foodsShown: true }]);
        lineAt = t;
        t += 3500;
      } else if (r.tierUp && gain > 0 && !r.quiet && !hatching) {
        // XP from studying (or a new level): a small celebration, not another meal.
        steps.push([t, { pose: "perk", line: levelled ? LINES.levelUp : studied ? LINES.studied : LINES.tier }]);
        lineAt = t;
        t += 1500;
      }
      // Then the next reaction waiting: a line gets a moment to be read before it's cut short.
      next = Math.max(hatching ? H : 0, gain > 0 && !hatching ? 950 : 0, lineAt >= 0 ? lineAt + 900 : 0);
    }
    const all = this.active().length;
    if (fed && doneAfter === all && shown.done < all) {
      // Every active goal fed: the one-time celebration, which nothing new cuts short (an untick
      // still can). If a goal was unticked before it starts, it's off.
      r.firm = true;
      const cheered = () => {
        if (this.cur !== r) return;
        this.finish(r);
        this.apply({ pose: "idle", line: null, ...RESET, ...this.held(this.state.ledger) });
      };
      steps.push([
        t,
        () => {
          if (this.displayed().done === this.active().length) {
            const go: Patch = { pose: "celebrate", line: LINES.celebrate, celebrating: true, sparkle: null };
            if (this.state.reduced) {
              this.apply(go);
              this.timers.push(setTimeout(cheered, CHEER_STILL));
              return;
            }
            this.afterLift = () => this.timers.push(setTimeout(cheered, CHEER_HOLD));
            this.setLift("prep", go);
            return;
          }
          r.firm = false;
          this.apply({ pose: "idle", line: null, ...RESET });
          this.finish(r);
        },
      ]);
      cheer = true;
    }
    if (!cheer) {
      steps.push([next, () => this.finish(r)]);
      // Let the egg nudge and shell chips finish before the idle reset clears them.
      if (gain > 0) t = Math.max(t, at + (hatching ? H : 950));
      steps.push([t, () => this.apply({ pose: "idle", line: null, ...RESET, ...this.held(this.state.ledger) })]);
    }
    steps.sort((a, b) => a[0] - b[0]);
    this.run(steps);
  }

  poke() {
    const s = this.state;
    if (this.busy || this.guideModal() || s.feeding || s.pose === "eat" || s.pose === "celebrate" || s.pose === "perk") return;
    this.dropCard();
    const phrase = POKES[this.pokeIndex % POKES.length];
    this.pokeIndex++;
    this.apply({ pose: "poke", line: phrase, foodsShown: true });
    const idle: Patch = { pose: "idle", line: null, ...RESET, ...this.held(this.state.ledger) };
    // A poke during the opening still lets the dragon finish saying its line.
    if (this.openingLine) this.run([[1900, { pose: "hello", line: this.openingLine, foodsShown: true }], [5400, idle]]);
    else this.run([[1900, idle]]);
  }

  renderVals() {
    const s = this.state;
    const targets = this.props.settings.targets;
    const progress = this.progress();
    const ok = checkEligibility(targets, progress);
    const claims = s.ledger.claims;
    const doneCount = this.doneCount();
    const active = this.active();
    const menu = this.menu();

    // Only the goals switched on in Goals, in their fixed order.
    const goals = active.map((id, i) => {
      const d = GOAL_DEFS[id];
      const item = menu[id] || { key: "none", vi: "" };
      const target = targets[id];
      const done = progress[id];
      const claimed = !!claims[id] && ok[id];
      // A claimed item looks ready (full, "+XP when fed") until Rồng Con has eaten it.
      const eating = claimed && (s.feeding === id || !!s.waiting[id]);
      const status = claimed && !eating ? "fed" : ok[id] ? "ready" : "locked";
      const b = s.bumps[id];
      // Full and fresh until it has been fed to Rồng Con, then its finished drawing.
      const finished = status === "fed";
      const flying = s.feeding === id && !s.reduced;
      // The real count, never capped at the target (18/5 is fine).
      const progressText = done + "/" + target + " " + plural(Math.max(done, target), d.one, d.many) + " " + d.verb;
      // The status line, ready and fed. A locked card shows neither but keeps their space, so
      // ticking or feeding never resizes it. The bonus is set by the goal's tier, from the target
      // chosen in Goals (not by how much more was done), but the card shows only the XP: a
      // Starter Vocab goal (under 5 words) is "Ready to feed · +0 XP".
      let checkLabel = "";
      const bonus = goalBonus(id, target);
      const xpNow = status === "fed" ? s.ledger.xp[id] : bonus;
      const readyText = "Ready to feed · +" + bonus + " XP";
      const fedText = "+" + xpNow + " XP earned";
      if (status === "ready") checkLabel = "Feed Rồng Con: mark " + d.section + " complete for " + bonus + " XP";
      if (status === "fed") checkLabel = d.section + " fed, " + xpNow + " XP. Uncheck to undo.";
      if (status === "locked") checkLabel = d.section + ": " + done + " of " + target + " " + plural(target, d.one, d.many) + " " + d.verb + ". Feeding unlocks at " + target + ".";
      const statusLines = [
        { text: readyText, cls: status === "ready" ? "on" : "off" },
        { text: fedText, cls: status === "fed" ? "on" : "off" },
      ];
      if (eating) checkLabel = d.section + " fed, " + s.ledger.xp[id] + " XP. Uncheck to undo.";
      return {
        id,
        section: d.section,
        href: d.href,
        foodVi: item.vi,
        key: item.key,
        oFull: finished ? 0 : flying ? 0.25 : 1,
        oDone: finished ? 1 : 0,
        progressText,
        statusLines,
        oCheck: claimed ? 1 : 0,
        oArc: status === "locked" && done > 0 ? 1 : 0,
        dash: (Math.min(1, done / target) * C).toFixed(1) + " " + C,
        checkedAttr: claimed,
        disabledAttr: status === "locked",
        checkClass: "check-btn is-" + (claimed ? "fed" : status),
        checkLabel,
        toggle: () => this.toggle(id),
        cardClass: "goal-card card-i" + i + (finished ? " is-done" : status === "ready" ? " is-ready" : "") + (s.foodsShown ? " shown" : " unshown"),
        tileClass: "food-tile" + (claimed && b > 0 ? " tile-done" : b > 0 ? (b % 2 ? " bump-a" : " bump-b") : ""),
        sparkle: s.sparkle === id,
      };
    });

    const line = typeof s.line === "string" ? LINES[s.line] : s.line;
    // The page shows XP and goals fed as the reactions land, not ahead of them.
    const xp = s.shownXp != null ? s.shownXp : this.totalXp();
    const shownDone = s.shownDone != null ? s.shownDone : doneCount;
    // The drawing, stage and bar follow the egg while the hatching shakes and cracks.
    const drawXp = this.drawnXp(xp);
    const hatchingNow = drawXp !== xp;
    // The level (and so Rồng Con's evolution) and the bar toward the next level.
    const lp = levelProgress(drawXp);
    const ev = evolutionFor(lp.level);
    const hatch = hatchFor(drawXp);
    const hatched = hatch.state === "hatched";
    const scale = this.dragonScale(shownDone, drawXp);
    const pct = Math.min(100, Math.floor(lp.fraction * 100));
    // The dialogue is up only while a big jump is about to start or running.
    const lifting = !s.reduced && s.pose === "celebrate" && liftsIn(s.lift, "rise", "jump");

    // Rồng Con daydreams about the next item still to come, until everything is eaten.
    let craving: MenuItem | null = null;
    for (const id of active) if (!craving && !(claims[id] && ok[id])) craving = menu[id] || null;
    const thought = thoughtFit(craving ? craving.key : "none");

    const dragonClass =
      "dragon pose-" + s.pose +
      " eyes-" + (EYES[s.pose] || "open") +
      " mouth-" + (MOUTH[s.pose] || "smile") +
      " hatch-" + hatch.state +
      (ev.fullBody ? " full-body" : "") +
      (craving ? "" : " sated") +
      (s.absorbing ? " absorbing" : "") +
      (hatch.wiggle ? " wiggle-" + hatch.wiggle : "") +
      (!hatched ? " limbs-hidden" : "") +
      (hatch.soon ? " hatch-soon" : "") +
      (hatch.ready ? " hatch-ready" : "") +
      [1, 2, 3, 4, 5, 6, 7].filter((n) => n <= hatch.reveal).map((n) => " rv-" + n).join("") +
      (hatch.frag.a ? " frag-a-on" : "") +
      (hatch.frag.b ? " frag-b-on" : "") +
      (s.hatchFx ? " fx-" + s.hatchFx : "") +
      (s.nudge ? " nudge-" + s.nudge : "") +
      (s.chips ? " chips-on" : "") +
      (s.bursting ? " bursting" : "") +
      (s.pose === "celebrate" && liftsIn(s.lift, "prep", "open", "rise") ? " jump-hold" : "");
    // The clearance is open from 'open' until 'close' starts (and through a re-measuring 'prep'
    // when it opened early).
    const clearNow = !s.reduced && (s.clear || 0) > 0 && s.lift && s.lift !== "close" ? s.clear || 0 : 0;
    // What the hero gives back below the companion: the clearance plus a long line's growth.
    const give = Math.min(CLEAR_PAD + CLEAR_GAP, clearNow + (s.over || 0));
    // Crack pieces: how much of each is drawn (hidden ones sit past the path's start, so no round
    // cap shows), the ink (light hairlines darkening as they spread) and their weight. Flaked
    // patches stay on the shell (the burst pieces carry them); chips, lifts and crumbs go at hatching.
    const cracks = crackProgress(drawXp);
    const bits = shellBitsFor(drawXp, hatched);
    const cv: Record<string, number> = {};
    for (const k of CRACKS) {
      const f = cracks.pieces[k.id];
      cv["crackOff_" + k.id] = f > 0 ? Math.round(100 * (1 - f)) : 105;
    }
    for (const k of CHIPS) cv["chipOn_" + k.id] = bits.chips[k.id] ? 1 : 0;
    for (const k of FLAKES) cv["flakeOn_" + k.id] = bits.flakes[k.id] ? 1 : 0;
    for (const k of LIFTS) cv["liftOn_" + k.id] = bits.lifts[k.id] ? 1 : 0;
    for (const k of CRUMBS) cv["crumbOn_" + k.id] = bits.crumbs[k.id] ? 1 : 0;

    return {
      cv,
      crackInk: crackInk(cracks.strength),
      crackK: (0.95 + 0.3 * cracks.strength).toFixed(2),
      goals,
      hasGoals: active.length > 0,
      noGoals: active.length === 0,
      // One or two cards keep a card's width, centred, instead of stretching across.
      goalsMax: active.length === 1 ? "380px" : active.length === 2 ? "774px" : "none",
      emptyClass: "menu-empty" + (s.foodsShown ? " shown" : " unshown"),
      servedText: active.length ? shownDone + " of " + active.length + " done" : "",
      hasBubble: !!line,
      bubbleVi: line ? line.vi : "",
      bubbleEn: line ? line.en : "",
      bubbleClass: "bubble " + (s.lineSeq % 2 ? "bubble-a" : "bubble-b"),
      dragonClass,
      talkClass: "talk-zone" + (lifting ? " talk-up" : ""),
      talkClear: clearNow,
      talkRoom: s.room != null ? s.room : 999,
      clearNow,
      heroClass: "jv-hero" + (s.lift ? " jv-clearing" : ""),
      heroPad: HERO_PAD - Math.min(give, CLEAR_PAD),
      heroPull: give > CLEAR_PAD ? CLEAR_PAD - give : 0,
      // (The daydream cloud only shares the screen with a line when motion is reduced.)
      talkRest: talkRestPx(hatch.state, scale, s.pose === "idle" && !!craving && !!line, s.reduced),
      talkLift: Math.max(talkRestPx(hatch.state, scale, false, s.reduced), talkLiftPx(hatch.state, scale)),
      thoughtKey: craving ? craving.key : "none",
      thoughtX: thought.x,
      thoughtY: thought.y,
      thoughtSize: thought.size,
      feedOn: !!(s.feeding && s.feedKey) && !s.reduced,
      feedKey: s.feedKey || "none",
      feedClass: "feed-item feed-" + s.feedMode + (s.feedSeq % 2 ? " feed-a" : " feed-b"),
      feedTop: s.feedTop,
      feedDx: s.feedDx,
      feedDy: s.feedDy,
      dragonLabel: hatched
        ? "Rồng Con, your dragon companion. Tap to say hi."
        : hatch.soon
          ? "Rồng Con, your dragon companion, almost ready to hatch. Tap to say hi."
          : "Rồng Con, your dragon companion, still hatching. Tap to say hi.",
      dragonScale: scale.toFixed(2),
      holeScale: hatch.hole,
      pawScale: (0.8 * hatch.hole).toFixed(3),
      frag_a: hatch.frag.a.toFixed(2),
      frag_b: hatch.frag.b.toFixed(2),
      poke: () => this.poke(),
      // The burst starts with the jump, once the dialogue is out of the way.
      showConfetti: s.celebrating && !liftsIn(s.lift, "prep", "open", "rise"),
      confetti: CONFETTI,
      hasXpChip: !!s.xpChip,
      xpChipText: s.xpChip ? s.xpChip.text : "",
      xpChipClass: "xp-chip " + (s.xpChip && s.xpChip.up ? "xp-up" : "xp-down") + (s.xpChipSeq % 2 ? " xp-chip-a" : " xp-chip-b"),
      moodText: moodFor(shownDone, active.length),
      stageLabel: "Level " + lp.level + " · " + ev.name,
      xpText: fmt(xp) + " XP",
      nextText: hatchingNow ? "Hatching now!" : lp.isMax ? "Top level!" : fmt(lp.to! - xp) + " XP to Level " + (lp.level + 1),
      xpBarLabel: lp.isMax ? "Experience: Level 100, the top level" : "Experience toward Level " + (lp.level + 1),
      levelCueClass: "level-cue" + (s.levelUp ? " on" + (s.levelUpSeq % 2 ? " level-cue-a" : " level-cue-b") : ""),
      levelCueText: s.levelUp ? "Level up! · Level " + s.levelUp : "",
      hatchCueClass: "hatch-cue" + (hatch.soon ? " on" : ""),
      hatchCueText: hatch.soon ? "Almost ready to hatch!" : "",
      xpPct: pct + "%",
      xpPctNum: pct,
      nav: NAV,
      ...this.guideVals(ev.name, !hatched),
    };
  }

  // The guide card's values: the speaker, every step (they share one cell, see .guide-step),
  // the dots and the controls.
  guideVals(stageName: string, inEgg: boolean) {
    const s = this.state;
    const g = s.guide;
    const G = g ? GUIDES[g.set] : null;
    const cur = G && g ? G.steps[g.step] : null;
    const who = TEACHERS[cur ? cur.who : "tuoi"];
    const step = g ? g.step : 0;
    const last = !!G && step === G.steps.length - 1;
    const pop = s.guideSeq % 2 ? " pop-a" : " pop-b";
    return {
      guideOn: !!G,
      guideLayerClass: "guide-layer" + (G && G.modal ? " is-modal" : " is-toast"),
      guideModal: !!G && G.modal,
      guideLabel: G ? G.label + (G.steps.length > 1 ? ", step " + (step + 1) + " of " + G.steps.length : "") : "",
      guideTextId: "jv-guide-text-" + step,
      guideHasSkip: !!G && G.steps.length > 1,
      guideSkipText: last ? "Maybe later" : "Skip intro",
      guideSkip: () => this.closeGuide(),
      guidePortraitClass: "guide-portrait" + pop,
      guideAvatarClass: "guide-avatar" + pop,
      guideTint: who.tint,
      guideInk: who.ink,
      guideWho: cur ? cur.who : "tuoi",
      guideExpr: cur ? cur.expr : "neutral",
      guideName: who.name,
      guideRole: who.role,
      guideSteps: G
        ? G.steps.map((st, i) => {
            const on = i === step;
            return {
              cls: "guide-step" + (on ? " on" : "") + (st.companion ? " has-companion" : ""),
              hiddenAttr: !on,
              textId: "jv-guide-text-" + i,
              hasLead: !!st.lead,
              lead: st.lead || "",
              text: inEgg && st.textEgg ? st.textEgg : st.text,
              hasChips: !!st.chips,
              chips: (st.chips || []).flatMap((href) => {
                const n = NAV.find((x) => x.href === href);
                return n ? [{ label: n.label, icon: n.icon, tint: n.tint, ink: n.ink }] : [];
              }),
              hasCompanion: !!st.companion,
              // While it's still an egg the card shows the egg (with a little hop), never the dragon.
              companionCls: "guide-companion" + (inEgg ? " is-egg" : ""),
              // Still in its egg: the intro shows just the whole egg, never its cracks or what peeks out.
              companionEgg: inEgg,
              companionDragon: !inEgg,
              companionStage: stageName,
            };
          })
        : [],
      guideDots: G && G.steps.length > 1 ? G.steps.map((_, i) => ({ cls: "guide-dot" + (i === step ? " on" : "") })) : [],
      guideHasBack: !!G && step > 0,
      guideBack: () => this.guideGo(-1),
      guideHasNext: !!G && !(cur && cur.cta),
      guideNextText: G ? (last ? G.done || "Done" : "Next") : "",
      guideNext: () => this.guideGo(1),
      guideHasCta: !!(cur && cur.cta),
      guideCtaText: cur && cur.cta ? cur.cta : "",
      guideCta: () => this.closeGuide(),
      guideAnnounce: s.guideAnnounce,
    };
  }

  render() {
    return <HomeView v={this.renderVals()} at={this.viewRefs} />;
  }
}
