"use client";

import { memo, useMemo, type Ref } from "react";
import { AvatarFigure } from "@/components/avatar/AvatarFigure";
import type { Avatar } from "@/lib/avatar/characters";
import type { Curriculum, GrammarLesson } from "@/lib/grammar/curriculum";
import { GRAMMAR_LEVELS, type GrammarLevel } from "@/lib/grammar/levels";
import { MAP, stairTreads, type MapLayout, type MapSection } from "@/lib/grammar/map-layout";
import { countCompleted } from "@/lib/grammar/progress";
import { LEVEL_COLOURS, placeSprites, SPRITES } from "@/lib/grammar/scenery";
import { LessonNodeArt } from "./LessonNode";
import { ChuaArt, SCENE_TEXTURE, SceneryDefs } from "./SceneryArt";

interface GrammarMapProps {
  layout: MapLayout;
  curriculum: Curriculum;
  /** Null while progress loads: every lotus shows closed. */
  completed: ReadonlySet<string> | null;
  /** The avatar and the lesson it stands on (null until progress has loaded). */
  avatar: Avatar | null;
  avatarAt: number | null;
  /** The lesson the learner is on (marked as the current step). */
  currentAt: number | null;
  onOpen: (lesson: GrammarLesson) => void;
  mapRef: Ref<HTMLDivElement>;
}

/**
 * The Grammar tab's winding path: every lesson from Beginner I at the bottom to Master at the
 * top, over scenery that changes level by level (layout in map-layout.ts, scenery in
 * scenery.ts). The lessons are a list in course order for keyboards and screen readers; each opens
 * its lesson card.
 */
export function GrammarMap({ layout, curriculum, completed, avatar, avatarAt, currentAt, onOpen, mapRef }: GrammarMapProps) {
  const half = MAP.columnWidth / 2;
  const nodes = layout.nodes;
  const lessons = curriculum.lessons;
  const summit = nodes[nodes.length - 1];
  const avatarNode = avatarAt != null ? nodes[avatarAt] : null;
  // From the staircase up, the trail is stone steps.
  const treads = useMemo(() => {
    const first = lessons.findIndex((l) => l.level.scene === "stairs" || l.level.scene === "chua");
    return first < 0 ? [] : stairTreads(nodes, first);
  }, [lessons, nodes]);

  return (
    <div ref={mapRef} className="relative w-full overflow-hidden" style={{ height: layout.height }}>
      <SceneryDefs />
      {layout.sections.map((s) => (
        <SceneBand key={s.level} section={s} level={GRAMMAR_LEVELS[s.level]} summitY={s.level === GRAMMAR_LEVELS.length - 1 && summit ? summit.y - s.top : null} />
      ))}

      <div className="absolute top-0 left-1/2" style={{ width: MAP.columnWidth, marginLeft: -half, height: layout.height }}>
        <svg className="absolute inset-0" width={MAP.columnWidth} height={layout.height} aria-hidden="true" style={{ overflow: "visible" }}>
          <path d={layout.trail} fill="none" stroke="#ffffff" strokeOpacity="0.55" strokeWidth="16" strokeLinecap="round" />
          <path d={layout.trail} fill="none" stroke="#5a3a28" strokeOpacity="0.28" strokeWidth="5" strokeDasharray="0.1 14" strokeLinecap="round" />
          {treads.map((t, i) => (
            <g key={i} transform={`translate(${t.x.toFixed(1)} ${t.y.toFixed(1)}) rotate(${(t.angle + 90).toFixed(1)})`}>
              <rect x="-19" y="-3" width="38" height="10" rx="3" fill="#b9a789" />
              <rect x="-19" y="-6" width="38" height="10" rx="3" fill="#ece4d6" stroke="#9d8b70" strokeWidth="1.5" />
            </g>
          ))}
        </svg>

        {layout.sections.map((s) => {
          const group = curriculum.byLevel[s.level];
          return (
            <LevelBanner
              key={s.level}
              y={s.bannerY}
              level={group.level}
              total={group.lessons.length}
              done={completed ? countCompleted(group.lessons, completed) : null}
            />
          );
        })}

        <ol aria-label="Grammar lessons, easiest first">
          {lessons.map((lesson, i) => {
            const p = nodes[i];
            const bloom = completed?.has(lesson.id) ?? false;
            const current = currentAt === i;
            return (
              <li key={lesson.id} className="absolute" style={{ left: p.x - 36, top: p.y - 36 }}>
                <button
                  type="button"
                  className="gm-node block"
                  onClick={() => onOpen(lesson)}
                  aria-current={current ? "step" : undefined}
                  aria-label={`${lesson.level.name}, lesson ${lesson.number} of ${curriculum.byLevel[lesson.level.index].lessons.length}: ${lesson.title}${bloom ? ", finished" : ""}`}
                  title={lesson.title}
                >
                  <LessonNodeArt scene={lesson.level.scene} bloom={bloom} current={current} />
                </button>
              </li>
            );
          })}
        </ol>

        {avatar && avatarNode ? (
          <div className="gm-avatar pointer-events-none absolute" style={{ left: avatarNode.x - 32, top: avatarNode.y - 80 }}>
            <div className="gm-bob">
              <AvatarFigure avatar={avatar} size={64} />
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function LevelBanner({ y, level, total, done }: { y: number; level: GrammarLevel; total: number; done: number | null }) {
  return (
    <div className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ top: y }}>
      <div className="flex flex-col items-center rounded-2xl border-2 border-b-4 border-ink-900/70 bg-surface/95 px-5 py-2 text-center whitespace-nowrap shadow-sm">
        <h2 className="font-heading text-lg leading-tight font-extrabold text-ink-900">{level.name}</h2>
        <p className="text-xs font-bold text-ink-500">
          {done == null ? `${total} lessons` : `${done} of ${total} bloomed`}
        </p>
      </div>
    </div>
  );
}

/** One level's stretch of background: its colours, texture and scattered drawings. */
const SceneBand = memo(function SceneBand({ section, level, summitY }: { section: MapSection; level: GrammarLevel; summitY: number | null }) {
  const sprites = useMemo(() => placeSprites(level.scene, level.index, section.height), [level, section.height]);
  const texture = SCENE_TEXTURE[level.scene];
  const from = LEVEL_COLOURS[level.index];
  const to = LEVEL_COLOURS[level.index + 1];
  // Where the scene changes, its texture fades out (and the next one's fades in) over 220px.
  const below = GRAMMAR_LEVELS[level.index - 1];
  const above = GRAMMAR_LEVELS[level.index + 1];
  const fade = `linear-gradient(to top, ${below?.scene === level.scene ? "#000 0" : "transparent 0, #000 220px"}, ${
    above?.scene === level.scene ? "#000 100%" : "#000 calc(100% - 220px), transparent 100%"
  })`;
  return (
    // One extra pixel overlaps the level above, so no seam shows between them at any zoom.
    <div className="absolute inset-x-0" style={{ top: section.top - 1, height: section.height + 1, background: `linear-gradient(to top, ${from}, ${to})` }} aria-hidden="true">
      {texture.opacity ? (
        <div
          className="absolute inset-0"
          style={{ backgroundImage: texture.image, opacity: texture.opacity, maskImage: fade, WebkitMaskImage: fade }}
        />
      ) : null}
      <svg className="absolute inset-0" width="100%" height={section.height}>
        {sprites.map((s, i) => {
          const box = SPRITES[s.sprite];
          return <use key={i} href={`#gm-${s.sprite}`} x={`${s.xPct}%`} y={s.y} width={s.width} height={(s.width * box.h) / box.w} />;
        })}
      </svg>
      {summitY != null ? (
        <div className="absolute left-1/2" style={{ top: summitY - 372, marginLeft: -150 }}>
          <ChuaArt />
        </div>
      ) : null}
    </div>
  );
});
