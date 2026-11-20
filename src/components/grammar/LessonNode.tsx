import type { ReactNode } from "react";
import type { SceneId } from "@/lib/grammar/levels";
import { LotusShape } from "./Lotus";

/**
 * One lesson on the map: a round stepping place that matches its scene (a lily pad on the lake and
 * paddies, a worn stone in the fields, a little paddy in the terraces, a rock in the mountains, a
 * carved step on the staircase, a lacquered tile at the chùa), with a lotus on it: a closed bud,
 * or in bloom once the lesson is finished. Drawn raised, like the app's buttons.
 */
const INK = "#5a3a28";

interface BaseStyle {
  face: string;
  depth: string;
  detail?: (key: string) => ReactNode;
}

const CX = 36;
const CY = 34;
const RX = 31;
const RY = 24;

function ellipsePoint(deg: number): string {
  const a = (deg * Math.PI) / 180;
  return `${(CX + RX * Math.cos(a)).toFixed(1)} ${(CY + RY * Math.sin(a)).toFixed(1)}`;
}
/** A lily pad: the ellipse with a wedge cut out, pointing up and right. */
const PAD = `M${CX} ${CY} L${ellipsePoint(-62)} A${RX} ${RY} 0 1 0 ${ellipsePoint(-38)} Z`;

const BASES: Record<SceneId, BaseStyle> = {
  lake: {
    face: "#8cc4a5",
    depth: "#5f9a7c",
    detail: (k) => <path key={k} d="M36 34 L14 26 M36 34 L12 40 M36 34 L28 56 M36 34 L52 54 M36 34 L64 38" stroke="#a9d6bc" strokeWidth="2" strokeLinecap="round" />,
  },
  paddy: {
    face: "#9ccc8e",
    depth: "#6ea361",
    detail: (k) => <path key={k} d="M36 34 L14 26 M36 34 L12 40 M36 34 L28 56 M36 34 L52 54 M36 34 L64 38" stroke="#bde0ae" strokeWidth="2" strokeLinecap="round" />,
  },
  fields: {
    face: "#ecd29e",
    depth: "#c9a46a",
    detail: (k) => (
      <g key={k} stroke="#d8b77d" strokeWidth="2" strokeLinecap="round" fill="none">
        <path d="M17 30 q4 -3 8 0 M45 44 q4 -3 8 0 M30 48 q3 -2 6 0" />
      </g>
    ),
  },
  terraces: {
    face: "#b7d98f",
    depth: "#82b062",
    detail: (k) => <ellipse key={k} cx="36" cy="35" rx="21" ry="14" fill="#d5ece6" stroke="#9cc6a8" strokeWidth="1.5" />,
  },
  mountains: {
    face: "#cdc6bc",
    depth: "#9d9388",
    detail: (k) => <path key={k} d="M16 36 l8 -4 l5 3 M44 48 l6 -5 l7 2" stroke="#ada498" strokeWidth="2" strokeLinecap="round" fill="none" />,
  },
  stairs: {
    face: "#e8dfcf",
    depth: "#b9a789",
    detail: (k) => <ellipse key={k} cx="36" cy="34" rx="23" ry="17" fill="none" stroke="#cdbfa6" strokeWidth="2" />,
  },
  chua: {
    face: "#e0604c",
    depth: "#a8361f",
    detail: (k) => <ellipse key={k} cx="36" cy="34" rx="24" ry="18" fill="none" stroke="#f2c35b" strokeWidth="3" />,
  },
};

export function LessonNodeArt({ scene, bloom, current }: { scene: SceneId; bloom: boolean; current: boolean }) {
  const base = BASES[scene];
  const pad = scene === "lake" || scene === "paddy";
  return (
    <svg viewBox="0 0 72 72" width="72" height="72" aria-hidden="true" style={{ overflow: "visible" }}>
      {current ? <ellipse className="gm-pulse" cx={CX} cy={CY + 3} rx={RX + 6} ry={RY + 6} fill="none" stroke="#fff3c4" strokeWidth="5" /> : null}
      {pad ? (
        <>
          <path d={PAD} transform="translate(0 6)" fill={base.depth} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
          <path d={PAD} fill={base.face} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      ) : (
        <>
          <ellipse cx={CX} cy={CY + 6} rx={RX} ry={RY} fill={base.depth} stroke={INK} strokeWidth="2.5" />
          <ellipse cx={CX} cy={CY} rx={RX} ry={RY} fill={base.face} stroke={INK} strokeWidth="2.5" />
        </>
      )}
      {base.detail?.("d")}
      {bloom ? <ellipse cx={CX} cy={CY} rx={RX - 3} ry={RY - 3} fill="#fff7d6" opacity="0.45" /> : null}
      <g transform={`translate(${CX - 17} ${CY - 26}) scale(0.85)`}>
        <LotusShape bloom={bloom} />
      </g>
    </svg>
  );
}
