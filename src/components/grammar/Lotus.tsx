/**
 * The Grammar map's progress marker: a closed lotus bud for a lesson not finished yet, a lotus in
 * bloom once it is. Used on the lesson circles, the lesson card and the directory.
 */
const INK = "#5a3a28";

export function Lotus({ bloom, size = 32, className }: { bloom: boolean; size?: number; className?: string }) {
  return (
    <svg viewBox="0 0 40 40" width={size} height={size} aria-hidden="true" className={className}>
      <LotusShape bloom={bloom} />
    </svg>
  );
}

/** The lotus itself, drawn in a 40×40 box (for use inside another SVG). */
export function LotusShape({ bloom }: { bloom: boolean }) {
  if (!bloom) {
    return (
      <g stroke={INK} strokeWidth="1.8" strokeLinejoin="round">
        <path d="M20 4.5 C 28 12.5 29.5 24 20 33 C 10.5 24 12 12.5 20 4.5 Z" fill="#f6b6c4" />
        <path d="M20 9 C 22.5 15 22.5 24 20 31" fill="none" stroke="#e7849c" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M20 33 C 12.5 31.5 8.5 25 9.5 18 C 14 20.5 17.5 26 20 33 Z" fill="#9fcf9a" />
        <path d="M20 33 C 27.5 31.5 31.5 25 30.5 18 C 26 20.5 22.5 26 20 33 Z" fill="#9fcf9a" />
      </g>
    );
  }
  return (
    <g stroke={INK} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M20 32 C 8 32 2.5 23.5 3 16 C 10.5 16.5 17 22.5 20 32 Z" fill="#fbcad5" />
      <path d="M20 32 C 32 32 37.5 23.5 37 16 C 29.5 16.5 23 22.5 20 32 Z" fill="#fbcad5" />
      <path d="M20 32 C 11 28 8.5 18 11.5 10.5 C 17.5 14 21 22 20 32 Z" fill="#f59ab0" />
      <path d="M20 32 C 29 28 31.5 18 28.5 10.5 C 22.5 14 19 22 20 32 Z" fill="#f59ab0" />
      <path d="M20 32 C 14.5 25 14.5 12 20 4 C 25.5 12 25.5 25 20 32 Z" fill="#fde1e7" />
      <ellipse cx="20" cy="29" rx="5.5" ry="2.6" fill="#f2c35b" />
    </g>
  );
}
