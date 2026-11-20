import type { ReactElement } from "react";
import type { SceneId } from "@/lib/grammar/levels";
import { SPRITES, type SpriteId } from "@/lib/grammar/scenery";

/**
 * The Grammar map's scenery drawings, as SVG symbols (`#gm-<sprite>`) that every level's
 * background reuses with <use>, plus each scene's texture (a tiled CSS background) and the chùa
 * at the top. Soft outlines, so the scenery stays behind the lesson circles.
 */
const LINE = "#6f8f7c";
const BROWN = "#8a6a52";

const ART: Record<SpriteId, ReactElement> = {
  lilypad: (
    <g stroke={LINE} strokeWidth="1.5" strokeLinejoin="round">
      <path d="M30 18 L44 5 A28 15 0 1 0 52.9 9.4 Z" fill="#8cc4a5" />
      <path d="M30 18 L12 12 M30 18 L8 22 M30 18 L26 32 M30 18 L44 30" stroke="#a9d6bc" strokeLinecap="round" />
    </g>
  ),
  lotus: (
    <g strokeLinejoin="round">
      <ellipse cx="30" cy="38" rx="27" ry="7" fill="#8cc4a5" stroke={LINE} strokeWidth="1.5" />
      <g transform="translate(13 4) scale(0.85)" stroke={BROWN} strokeWidth="1.6">
        <path d="M20 32 C 8 32 2.5 23.5 3 16 C 10.5 16.5 17 22.5 20 32 Z" fill="#fbcad5" />
        <path d="M20 32 C 32 32 37.5 23.5 37 16 C 29.5 16.5 23 22.5 20 32 Z" fill="#fbcad5" />
        <path d="M20 32 C 11 28 8.5 18 11.5 10.5 C 17.5 14 21 22 20 32 Z" fill="#f59ab0" />
        <path d="M20 32 C 29 28 31.5 18 28.5 10.5 C 22.5 14 19 22 20 32 Z" fill="#f59ab0" />
        <path d="M20 32 C 14.5 25 14.5 12 20 4 C 25.5 12 25.5 25 20 32 Z" fill="#fde1e7" />
        <ellipse cx="20" cy="29" rx="5.5" ry="2.6" fill="#f2c35b" />
      </g>
    </g>
  ),
  bud: (
    <g strokeLinejoin="round">
      <path d="M15 52 C 13 42 16 32 15 22" fill="none" stroke="#6fae8e" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M15 4 C 22 11 23 19 15 26 C 7 19 8 11 15 4 Z" fill="#f6b6c4" stroke={BROWN} strokeWidth="1.5" />
    </g>
  ),
  reeds: (
    <g fill="none" strokeLinecap="round">
      <path d="M8 60 C 8 42 6 26 4 12 M16 60 C 16 40 18 22 20 6 M26 60 C 27 46 30 32 35 20" stroke="#7fae6a" strokeWidth="2.2" />
      <ellipse cx="20.3" cy="12" rx="2.6" ry="6" fill="#a7744a" />
      <ellipse cx="4.3" cy="17" rx="2.4" ry="5.5" fill="#a7744a" />
    </g>
  ),
  ripple: (
    <g fill="none" stroke="#ffffff" strokeOpacity="0.75" strokeWidth="2">
      <ellipse cx="30" cy="10" rx="27" ry="7.5" />
      <ellipse cx="30" cy="10" rx="14" ry="3.6" />
    </g>
  ),
  fish: (
    <g stroke={BROWN} strokeWidth="1.3" strokeLinejoin="round">
      <path d="M30 10 L39 3 L38 17 Z" fill="#f7b267" />
      <ellipse cx="17" cy="10" rx="15" ry="7" fill="#f6a35b" />
      <circle cx="8" cy="9" r="1.4" fill={BROWN} />
      <path d="M17 4 q4 6 0 12" fill="none" stroke="#fde0b8" />
    </g>
  ),
  boat: (
    <g stroke={BROWN} strokeWidth="1.8" strokeLinejoin="round">
      <path d="M50 4 L50 30" stroke={BROWN} strokeWidth="2" />
      <path d="M32 24 Q50 8 68 24 Z" fill="#e6c88f" />
      <path d="M4 24 Q50 46 96 24 L88 33 Q50 48 12 33 Z" fill="#a7744a" />
      <path d="M14 30 Q50 42 86 30" fill="none" stroke="#c99a6a" />
      <path d="M6 40 h20 M70 41 h22" stroke="#ffffff" strokeOpacity="0.7" strokeLinecap="round" />
    </g>
  ),
  rice: (
    <g fill="none" strokeLinecap="round">
      <path d="M20 34 C 19 24 14 14 8 8 M20 34 C 20 22 21 12 22 2 M20 34 C 22 24 27 16 33 10 M20 34 C 18 28 12 24 5 22 M20 34 C 23 28 29 25 36 24" stroke="#6fa65a" strokeWidth="2.2" />
      <path d="M6 34.5 H34" stroke="#ffffff" strokeOpacity="0.6" strokeWidth="2" />
    </g>
  ),
  egret: (
    <g stroke={BROWN} strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
      <path d="M17 50 L18 36 M24 50 L23 36" fill="none" stroke="#c99a3a" strokeWidth="1.6" />
      <path d="M10 28 C 10 20 20 18 30 22 C 36 26 34 34 26 36 C 18 38 10 36 10 28 Z" fill="#ffffff" />
      <path d="M28 23 C 30 16 22 14 24 8 C 25 5 29 5 30 8" fill="none" stroke="#ffffff" strokeWidth="5" />
      <path d="M28 23 C 30 16 22 14 24 8 C 25 5 29 5 30 8" fill="none" />
      <path d="M30 7 L39 9 L30 10 Z" fill="#f2c35b" />
    </g>
  ),
  grass: (
    <g fill="none" stroke="#7fb069" strokeWidth="2" strokeLinecap="round">
      <path d="M6 20 C 6 14 4 10 2 6 M12 20 C 12 12 14 8 16 2 M18 20 C 19 14 22 10 26 8 M24 20 C 25 16 27 14 29 13" />
    </g>
  ),
  tree: (
    <g stroke={BROWN} strokeWidth="1.6" strokeLinejoin="round">
      <path d="M26 72 L28 44 L32 44 L34 72 Z" fill="#a7744a" />
      <circle cx="20" cy="36" r="15" fill="#86bd78" />
      <circle cx="40" cy="34" r="16" fill="#86bd78" />
      <circle cx="30" cy="20" r="17" fill="#99ca86" />
      <circle cx="24" cy="18" r="4" fill="#b5dba0" stroke="none" />
    </g>
  ),
  bamboo: (
    <g strokeLinecap="round">
      <path d="M10 84 V10 M20 84 V2 M30 84 V14" stroke="#9cc56b" strokeWidth="4" />
      <path d="M8 30 h4 M8 54 h4 M18 22 h4 M18 46 h4 M18 70 h4 M28 36 h4 M28 60 h4" stroke="#6f9a4a" strokeWidth="2" />
      <path d="M20 20 q10 -6 18 -2 q-10 4 -18 2 Z M10 40 q-8 -6 -9 -12 q7 4 9 12 Z M30 30 q8 -2 10 -8 q-8 2 -10 8 Z" fill="#7fb069" />
    </g>
  ),
  haystack: (
    <g stroke="#b8893a" strokeWidth="1.6" strokeLinejoin="round">
      <path d="M4 38 C 4 16 14 4 25 4 C 36 4 46 16 46 38 Z" fill="#f2c35b" />
      <path d="M12 30 q6 -3 12 0 M22 18 q6 -3 12 0 M26 32 q6 -3 12 0" fill="none" />
      <path d="M25 4 V0" stroke={BROWN} strokeWidth="2" />
    </g>
  ),
  flowers: (
    <g>
      <path d="M6 24 V14 M18 24 V10 M30 24 V15" stroke="#7fb069" strokeWidth="1.8" />
      <circle cx="6" cy="12" r="4" fill="#fde7a8" stroke="#e5b84a" />
      <circle cx="18" cy="8" r="4.5" fill="#ff9c8d" stroke="#e0604c" />
      <circle cx="30" cy="13" r="4" fill="#ffffff" stroke="#d6c5b5" />
      <circle cx="18" cy="8" r="1.5" fill="#fde7a8" />
    </g>
  ),
  peak: (
    <g strokeLinejoin="round">
      <path d="M0 110 L58 22 Q70 6 82 22 L160 110 Z" fill="#a9bcb9" stroke="#7f9590" strokeWidth="1.6" />
      <path d="M70 12 Q76 14 82 22 L160 110 L104 110 Q92 70 70 12 Z" fill="#94aaa6" />
      <path d="M58 22 Q70 6 82 22 L76 30 L70 24 L64 31 Z" fill="#e8efec" />
      <ellipse cx="80" cy="96" rx="84" ry="10" fill="#ffffff" opacity="0.45" />
    </g>
  ),
  pine: (
    <g stroke="#4f7d61" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M18 64 h4 v-12 h-4 Z" fill="#a7744a" />
      <path d="M20 4 L32 22 H8 Z" fill="#6fa585" />
      <path d="M20 14 L35 36 H5 Z" fill="#5f9a74" />
      <path d="M20 26 L38 52 H2 Z" fill="#558c69" />
    </g>
  ),
  rock: (
    <g stroke="#958b80" strokeWidth="1.4" strokeLinejoin="round">
      <path d="M4 26 C 2 14 12 4 24 5 C 36 6 44 16 40 26 Z" fill="#c8c1b6" />
      <path d="M14 12 q6 -4 12 -2" fill="none" stroke="#e3ded6" strokeWidth="2.5" strokeLinecap="round" />
    </g>
  ),
  cloud: (
    <g fill="#ffffff" opacity="0.92">
      <circle cx="26" cy="26" r="14" />
      <circle cx="46" cy="18" r="17" />
      <circle cx="66" cy="26" r="13" />
      <rect x="14" y="24" width="64" height="16" rx="8" />
    </g>
  ),
  lantern: (
    <g stroke={BROWN} strokeWidth="1.4" strokeLinejoin="round">
      <path d="M15 0 V12" />
      <rect x="10" y="10" width="10" height="4" rx="1" fill="#f2c35b" />
      <ellipse cx="15" cy="24" rx="12" ry="11" fill="#e0604c" />
      <path d="M15 13 V35 M8 16 q-3 8 0 16 M22 16 q3 8 0 16" fill="none" stroke="#b53722" />
      <rect x="10" y="34" width="10" height="4" rx="1" fill="#f2c35b" />
      <path d="M15 38 V50" stroke="#f2c35b" strokeWidth="2" />
    </g>
  ),
};

/** The symbols, once per page (hidden). */
export function SceneryDefs() {
  return (
    <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
      <defs>
        {(Object.keys(ART) as SpriteId[]).map((id) => (
          <symbol key={id} id={`gm-${id}`} viewBox={`0 0 ${SPRITES[id].w} ${SPRITES[id].h}`} overflow="visible">
            {ART[id]}
          </symbol>
        ))}
      </defs>
    </svg>
  );
}

const svgUrl = (w: number, h: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${body}</svg>`)}")`;

/** Each scene's texture, tiled behind the drawings. */
export const SCENE_TEXTURE: Record<SceneId, { image: string; opacity: number }> = {
  lake: {
    image: svgUrl(220, 150, `<g fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".6"><path d="M20 40 q12 -6 24 0 t24 0"/><path d="M130 110 q12 -6 24 0 t24 0"/><path d="M150 30 q8 -4 16 0"/><path d="M50 120 q8 -4 16 0"/></g>`),
    opacity: 1,
  },
  paddy: {
    image: svgUrl(160, 70, `<g fill="none" stroke-linecap="round"><path d="M0 64 H160" stroke="#fff" stroke-opacity=".5" stroke-width="2"/><g stroke="#86b874" stroke-width="2"><path d="M20 60 l-3 -10 M20 60 l0 -12 M20 60 l3 -10"/><path d="M60 60 l-3 -10 M60 60 l0 -12 M60 60 l3 -10"/><path d="M100 60 l-3 -10 M100 60 l0 -12 M100 60 l3 -10"/><path d="M140 60 l-3 -10 M140 60 l0 -12 M140 60 l3 -10"/><path d="M40 26 l-3 -10 M40 26 l0 -12 M40 26 l3 -10"/><path d="M80 26 l-3 -10 M80 26 l0 -12 M80 26 l3 -10"/><path d="M120 26 l-3 -10 M120 26 l0 -12 M120 26 l3 -10"/></g></g>`),
    opacity: 0.8,
  },
  fields: {
    image: svgUrl(180, 120, `<g fill="none" stroke="#9cc77f" stroke-width="2" stroke-linecap="round" opacity=".7"><path d="M20 30 l2 -8 M26 30 l-1 -9 M120 90 l2 -8 M126 90 l-1 -9 M80 60 l2 -6 M150 20 l1 -7"/></g>`),
    opacity: 1,
  },
  terraces: {
    image: svgUrl(400, 160, `<path d="M0 0 H400 V40 C 300 70 100 10 0 40 Z" fill="#c4df9f"/><path d="M0 40 C 100 10 300 70 400 40 V120 C 300 150 100 90 0 120 Z" fill="#b2d68b"/><path d="M0 120 C 100 90 300 150 400 120 V160 H0 Z" fill="#c4df9f"/><g fill="none" stroke="#8fbf6c" stroke-width="3"><path d="M0 40 C 100 10 300 70 400 40"/><path d="M0 120 C 100 90 300 150 400 120"/></g><g fill="none" stroke="#fff" stroke-opacity=".45" stroke-width="2"><path d="M30 70 h60 M250 95 h70 M160 20 h40 M300 145 h50"/></g>`),
    opacity: 0.85,
  },
  mountains: {
    image: svgUrl(520, 300, `<path d="M0 300 V210 L60 150 L110 190 L180 110 L240 170 L300 130 L370 200 L430 140 L520 210 V300 Z" fill="#aebfbd" opacity=".35"/><path d="M0 300 V250 L80 200 L150 240 L230 180 L310 235 L400 190 L470 230 L520 210 V300 Z" fill="#9fb3ae" opacity=".3"/><g fill="none" stroke="#9aa9a6" stroke-width="2" stroke-linecap="round" opacity=".5"><path d="M20 40 l14 -8 l10 6"/><path d="M340 70 l14 -8 l10 6"/></g>`),
    opacity: 1,
  },
  stairs: {
    image: svgUrl(200, 140, `<g fill="none" stroke="#b9b3c2" stroke-width="2" stroke-linecap="round" opacity=".5"><path d="M10 30 h40 M120 100 h50 M70 70 h30"/></g>`),
    opacity: 1,
  },
  chua: { image: "none", opacity: 0 },
};

/** The chùa at the top of the path (Master), with the morning sun behind it. 300×320. */
export function ChuaArt() {
  const ink = "#5a3a28";
  return (
    <svg viewBox="0 0 300 320" width="300" height="320" aria-hidden="true" style={{ overflow: "visible" }}>
      <circle cx="150" cy="120" r="96" fill="#fde3a7" opacity="0.8" />
      <circle cx="150" cy="120" r="70" fill="#fdd38a" opacity="0.55" />
      <g stroke={ink} strokeWidth="2.5" strokeLinejoin="round">
        {/* Platform and steps */}
        <path d="M24 286 H276 L264 300 H36 Z" fill="#e8dfcf" />
        <path d="M118 300 H182 L188 320 H112 Z" fill="#d9cdb8" />
        <path d="M115 310 H185" fill="none" stroke="#b9a789" strokeWidth="2" />
        {/* Ground floor */}
        <rect x="66" y="212" width="168" height="74" fill="#fffaf1" />
        <rect x="74" y="212" width="12" height="74" fill="#d8452f" />
        <rect x="214" y="212" width="12" height="74" fill="#d8452f" />
        <rect x="110" y="212" width="10" height="74" fill="#d8452f" />
        <rect x="180" y="212" width="10" height="74" fill="#d8452f" />
        <path d="M132 286 V246 Q150 228 168 246 V286 Z" fill="#b53722" />
        <path d="M150 238 V286" fill="none" stroke="#8a2a18" strokeWidth="2" />
        {/* Bottom roof */}
        <path d="M22 214 C 46 212 60 204 72 190 L228 190 C 240 204 254 212 278 214 C 254 220 234 218 218 212 L82 212 C 66 218 46 220 22 214 Z" fill="#d8452f" />
        <path d="M72 190 H228" fill="none" stroke="#f2c35b" strokeWidth="4" />
        <circle cx="22" cy="212" r="4" fill="#f2c35b" />
        <circle cx="278" cy="212" r="4" fill="#f2c35b" />
        {/* Plaque */}
        <rect x="128" y="196" width="44" height="14" rx="2" fill="#f2c35b" />
        <path d="M136 203 h28" fill="none" stroke="#b8893a" strokeWidth="2" />
        {/* Second floor */}
        <rect x="98" y="150" width="104" height="42" fill="#fffaf1" />
        <circle cx="150" cy="171" r="10" fill="#f2c35b" />
        <path d="M150 161 V181 M140 171 H160" fill="none" stroke="#b8893a" strokeWidth="2" />
        <path d="M56 152 C 76 150 86 144 96 132 L204 132 C 214 144 224 150 244 152 C 224 158 208 156 196 150 L104 150 C 92 156 76 158 56 152 Z" fill="#d8452f" />
        <path d="M96 132 H204" fill="none" stroke="#f2c35b" strokeWidth="4" />
        <circle cx="56" cy="150" r="3.5" fill="#f2c35b" />
        <circle cx="244" cy="150" r="3.5" fill="#f2c35b" />
        {/* Top floor */}
        <rect x="122" y="100" width="56" height="34" fill="#fffaf1" />
        <path d="M86 102 C 102 100 110 94 118 84 L182 84 C 190 94 198 100 214 102 C 198 108 188 106 178 100 L122 100 C 112 106 102 108 86 102 Z" fill="#d8452f" />
        <path d="M118 84 H182" fill="none" stroke="#f2c35b" strokeWidth="4" />
        <circle cx="86" cy="100" r="3" fill="#f2c35b" />
        <circle cx="214" cy="100" r="3" fill="#f2c35b" />
        {/* Finial */}
        <path d="M150 84 V46" fill="none" strokeWidth="3" />
        <circle cx="150" cy="74" r="6" fill="#f2c35b" />
        <circle cx="150" cy="60" r="5" fill="#f2c35b" />
        <circle cx="150" cy="47" r="4" fill="#f2c35b" />
        {/* Lanterns */}
        <path d="M84 214 V224 M216 214 V224" fill="none" strokeWidth="1.5" />
        <ellipse cx="84" cy="232" rx="8" ry="9" fill="#e0604c" />
        <ellipse cx="216" cy="232" rx="8" ry="9" fill="#e0604c" />
      </g>
    </svg>
  );
}
