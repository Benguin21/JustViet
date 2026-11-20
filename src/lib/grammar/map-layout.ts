/**
 * The Grammar map's geometry: where every lesson circle sits on the winding path, and where each
 * level's stretch of scenery starts and ends. The path starts at the bottom (Beginner I's first
 * lesson) and climbs; it swings left and right in an S (one full swing every 8 lessons) inside a
 * fixed-width column, so the same numbers work on any screen. Coordinates are pixels from the top
 * of the map. In Master the swing narrows to nothing, so the last lessons climb straight up to
 * the chùa. Pure.
 */
export const MAP = {
  /** The column the path winds in; it's centred on the page. */
  columnWidth: 340,
  /** How far the path swings either side of the centre line. */
  swing: 96,
  /** Lessons per full left-right swing. */
  period: 8,
  /** Vertical distance between lessons. */
  step: 100,
  /** Room at the start of each level for its banner. */
  banner: 150,
  /** Room above each level's last lesson. */
  topPad: 20,
  /** Extra room below the very first lesson. */
  startPad: 40,
  /** Room above the last lesson for the chùa. */
  summit: 380,
} as const;

export interface MapSection {
  /** Index into the levels the layout was given. */
  level: number;
  top: number;
  height: number;
  /** The centre line of the level's banner. */
  bannerY: number;
}

export interface MapPoint {
  x: number;
  y: number;
}

export interface MapLayout {
  height: number;
  sections: MapSection[];
  /** One per lesson, in course order (the first is lowest). */
  nodes: MapPoint[];
  /** The SVG path the trail between the circles follows. */
  trail: string;
}

/** Lays out levels of the given sizes (lessons per level, easiest first). */
export function layoutMap(levelSizes: readonly number[]): MapLayout {
  const last = levelSizes.length - 1;
  const centre = MAP.columnWidth / 2;
  // Work up from the bottom first, then flip into top-based coordinates.
  const fromBottom: { level: number; start: number; height: number; banner: number }[] = [];
  const nodesUp: MapPoint[] = [];
  let at = 0;
  let g = 0;
  levelSizes.forEach((n, level) => {
    const start = at;
    const pad = level === 0 ? MAP.startPad : 0;
    for (let j = 0; j < n; j++, g++) {
      const narrow = level === last ? 1 - (j + 1) / n : 1;
      nodesUp.push({
        x: Math.round(centre + MAP.swing * narrow * Math.sin((g * 2 * Math.PI) / MAP.period)),
        y: start + pad + MAP.banner + MAP.step * (j + 0.5),
      });
    }
    const height = pad + MAP.banner + n * MAP.step + MAP.topPad + (level === last ? MAP.summit : 0);
    fromBottom.push({ level, start, height, banner: start + pad + MAP.banner / 2 });
    at += height;
  });
  const height = at;
  const sections = fromBottom.map((s) => ({
    level: s.level,
    top: height - s.start - s.height,
    height: s.height,
    bannerY: height - s.banner,
  }));
  const nodes = nodesUp.map((p) => ({ x: p.x, y: height - p.y }));
  return { height, sections, nodes, trail: trailPath(nodes) };
}

/** A smooth trail through the points, bottom to top: each hop leaves and arrives vertically. */
export function trailPath(points: readonly MapPoint[]): string {
  if (!points.length) return "";
  const parts = [`M ${points[0].x} ${points[0].y + MAP.step}`, `L ${points[0].x} ${points[0].y}`];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const half = (a.y - b.y) / 2;
    parts.push(`C ${a.x} ${a.y - half} ${b.x} ${b.y + half} ${b.x} ${b.y}`);
  }
  return parts.join(" ");
}

/** A point on the trail's hop from `a` up to `b` (t from 0 to 1), and the trail's heading there in degrees. */
export function hopPoint(a: MapPoint, b: MapPoint, t: number): MapPoint & { angle: number } {
  const half = (a.y - b.y) / 2;
  const p = [a, { x: a.x, y: a.y - half }, { x: b.x, y: b.y + half }, b];
  const m = 1 - t;
  const at = (k: "x" | "y") => m * m * m * p[0][k] + 3 * m * m * t * p[1][k] + 3 * m * t * t * p[2][k] + t * t * t * p[3][k];
  const d = (k: "x" | "y") => 3 * m * m * (p[1][k] - p[0][k]) + 6 * m * t * (p[2][k] - p[1][k]) + 3 * t * t * (p[3][k] - p[2][k]);
  return { x: at("x"), y: at("y"), angle: (Math.atan2(d("y"), d("x")) * 180) / Math.PI };
}

/** Space between stone steps along the trail, and the room kept clear round each lesson circle. */
export const TREAD_GAP = 15;
const TREAD_CLEAR = 30;

/**
 * Stone steps along the trail from lesson `from` (an index) to the last lesson: evenly spaced
 * along each hop, leaving the lesson circles clear.
 */
export function stairTreads(nodes: readonly MapPoint[], from: number): (MapPoint & { angle: number })[] {
  const out: (MapPoint & { angle: number })[] = [];
  for (let i = Math.max(1, from); i < nodes.length; i++) {
    const a = nodes[i - 1];
    const b = nodes[i];
    const samples = Array.from({ length: 41 }, (_, k) => hopPoint(a, b, k / 40));
    const lengths = [0];
    for (let k = 1; k < samples.length; k++) {
      lengths.push(lengths[k - 1] + Math.hypot(samples[k].x - samples[k - 1].x, samples[k].y - samples[k - 1].y));
    }
    const total = lengths[lengths.length - 1];
    const span = total - 2 * TREAD_CLEAR;
    if (span <= 0) continue;
    const count = Math.max(1, Math.round(span / TREAD_GAP));
    for (let n = 0; n <= count; n++) {
      const want = TREAD_CLEAR + (span * n) / count;
      const k = Math.max(1, lengths.findIndex((l) => l >= want));
      const f = (want - lengths[k - 1]) / (lengths[k] - lengths[k - 1] || 1);
      out.push(hopPoint(a, b, (k - 1 + f) / 40));
    }
  }
  return out;
}

/** The section (by index) that a page position falls in, or -1. */
export function sectionAt(layout: MapLayout, y: number): number {
  return layout.sections.findIndex((s) => y >= s.top && y < s.top + s.height);
}
