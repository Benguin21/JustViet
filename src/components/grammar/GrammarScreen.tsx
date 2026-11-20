"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/lib/auth-context";
import { avatarFor } from "@/lib/avatar/characters";
import { GRAMMAR_ROUTES, hasGuide } from "@/lib/grammar/content";
import { CURRICULUM, type GrammarLesson } from "@/lib/grammar/curriculum";
import { GRAMMAR_LEVELS } from "@/lib/grammar/levels";
import { layoutMap, sectionAt } from "@/lib/grammar/map-layout";
import { avatarIndex, countCompleted } from "@/lib/grammar/progress";
import { useGrammarProgress } from "@/lib/grammar/useGrammarProgress";
import { GrammarDirectory } from "./GrammarDirectory";
import { GrammarMap } from "./GrammarMap";
import { LessonCard } from "./LessonCard";
import "./grammar-map.css";

const LAYOUT = layoutMap(CURRICULUM.byLevel.map((l) => l.lessons.length));
/** The avatar glides to its new lesson only over a short hop; further than this it just appears. */
const MAX_GLIDE = 6;
const spotKey = (uid: string) => `jv.grammar.spot.${uid}`;

/**
 * The Grammar tab: the winding lesson map (GrammarMap), a toolbar with the ☰ directory and the
 * level in view, the lesson card, and the avatar standing on the learner's lesson. It opens
 * scrolled to that lesson; when the learner has moved on since their last visit, the avatar
 * glides there from where they left it.
 */
export function GrammarScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { data, error, retry } = useGrammarProgress();
  const lessons = CURRICULUM.lessons;
  const mapRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<GrammarLesson | null>(null);
  const [directory, setDirectory] = useState(false);
  const [inView, setInView] = useState(0);
  const [shownAt, setShownAt] = useState<number | null>(null);

  const completed = data?.completed ?? null;
  const avatar = useMemo(() => (data ? avatarFor(data.xp) : null), [data]);
  const target = completed ? avatarIndex(lessons, completed) : null;

  const scrollToLesson = useCallback((index: number, smooth: boolean) => {
    const map = mapRef.current;
    const node = LAYOUT.nodes[index];
    if (!map || !node) return;
    const top = map.getBoundingClientRect().top + window.scrollY + node.y - window.innerHeight * 0.55;
    window.scrollTo({ top: Math.max(0, top), behavior: smooth ? "smooth" : "auto" });
  }, []);

  // Open at the bottom of the path (the first lesson) until progress says where the learner is;
  // stop following once they scroll for themselves.
  const touched = useRef(false);
  useLayoutEffect(() => {
    // The map always opens at the learner's lesson, so the browser mustn't restore an old position.
    const restoration = window.history.scrollRestoration;
    window.history.scrollRestoration = "manual";
    scrollToLesson(0, false);
    const mark = () => {
      touched.current = true;
    };
    const opts = { passive: true } as const;
    window.addEventListener("wheel", mark, opts);
    window.addEventListener("touchmove", mark, opts);
    window.addEventListener("keydown", mark);
    return () => {
      window.history.scrollRestoration = restoration;
      window.removeEventListener("wheel", mark);
      window.removeEventListener("touchmove", mark);
      window.removeEventListener("keydown", mark);
    };
  }, [scrollToLesson]);

  // Once progress loads: scroll to the learner's lesson, and glide the avatar there from the
  // lesson it stood on last visit (remembered per account in this browser).
  const glide = useRef<{ target: number; from: number | null } | null>(null);
  useEffect(() => {
    if (target == null || !uid) return;
    if (glide.current?.target !== target) {
      let from: number | null = null;
      try {
        const last = window.localStorage.getItem(spotKey(uid));
        const i = last ? lessons.findIndex((l) => l.id === last) : -1;
        if (i >= 0 && i !== target && Math.abs(i - target) <= MAX_GLIDE) from = i;
        window.localStorage.setItem(spotKey(uid), lessons[target].id);
      } catch {
        // Storage can be blocked; the avatar then simply appears in place.
      }
      glide.current = { target, from };
    }
    const from = glide.current.from;
    if (!touched.current) scrollToLesson(target, false);
    const timers = [window.setTimeout(() => setShownAt(from ?? target), 0)];
    if (from != null) timers.push(window.setTimeout(() => setShownAt(target), 650));
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [target, uid, lessons, scrollToLesson]);

  // The level in the middle of the screen, for the toolbar.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const map = mapRef.current;
      if (!map) return;
      const i = sectionAt(LAYOUT, window.innerHeight / 2 - map.getBoundingClientRect().top);
      if (i >= 0) setInView(LAYOUT.sections[i].level);
    };
    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(update);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) window.cancelAnimationFrame(frame);
    };
  }, []);

  const closeCard = useCallback(() => setOpen(null), []);
  const closeDirectory = useCallback(() => setDirectory(false), []);
  const pick = useCallback(
    (lesson: GrammarLesson) => {
      setDirectory(false);
      if (hasGuide(lesson.id)) {
        router.push(GRAMMAR_ROUTES.guide(lesson.id));
        return;
      }
      touched.current = true;
      scrollToLesson(lesson.order - 1, false);
      setOpen(lesson);
    },
    [router, scrollToLesson],
  );

  const level = CURRICULUM.byLevel[inView];

  return (
    <main className="relative flex flex-1 flex-col">
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b-2 border-ink-300/30 bg-surface/95 px-3 py-2 backdrop-blur sm:px-6">
        <button
          type="button"
          onClick={() => setDirectory(true)}
          aria-label="All grammar lessons"
          aria-haspopup="dialog"
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border-2 border-b-4 border-ink-300/60 bg-surface text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 active:border-b-2"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 6.5h16M4 12h16M4 17.5h16" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
          </svg>
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-[11px] font-extrabold tracking-widest text-ink-500 uppercase">Grammar</p>
          <p className="truncate font-heading text-lg leading-tight font-extrabold text-ink-900" aria-live="polite">
            {GRAMMAR_LEVELS[inView].name}
            {completed ? (
              <span className="ml-2 text-sm font-bold text-ink-500">
                {countCompleted(level.lessons, completed)}/{level.lessons.length}
              </span>
            ) : null}
          </p>
        </div>
        <button
          type="button"
          onClick={() => target != null && scrollToLesson(target, true)}
          disabled={target == null}
          className="flex h-11 shrink-0 items-center justify-center rounded-xl border-2 border-b-4 border-ink-300/60 bg-surface px-3 text-sm font-extrabold text-ink-700 hover:bg-yellow-50 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 active:border-b-2 disabled:opacity-50"
        >
          My lesson
        </button>
      </div>

      {error ? (
        <div className="sticky top-[62px] z-20 mx-auto mt-2 flex max-w-md items-center gap-3 rounded-2xl border-2 border-red-200 bg-red-50 px-4 py-2" role="alert">
          <p className="flex-1 text-sm font-semibold text-red-600">Couldn’t load your progress. {error}</p>
          <Button size="sm" fullWidth={false} onClick={retry}>
            Retry
          </Button>
        </div>
      ) : null}

      <GrammarMap
        layout={LAYOUT}
        curriculum={CURRICULUM}
        completed={completed}
        avatar={avatar}
        avatarAt={shownAt}
        currentAt={target}
        onOpen={setOpen}
        mapRef={mapRef}
      />

      {open ? (
        <LessonCard
          lesson={open}
          levelSize={CURRICULUM.byLevel[open.level.index].lessons.length}
          finished={completed ? completed.has(open.id) : null}
          onClose={closeCard}
        />
      ) : null}
      {directory ? <GrammarDirectory curriculum={CURRICULUM} completed={completed} onPick={pick} onClose={closeDirectory} /> : null}
    </main>
  );
}
