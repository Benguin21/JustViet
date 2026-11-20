import type { Avatar } from "@/lib/avatar/characters";

/**
 * The learner's avatar in its current form, as a small standing figure (for the Grammar map and
 * other places outside Home). Rồng Con's drawing is a still copy of Home's (HomeView.tsx's
 * `#jvEggShell` and `#jvDragonArt`, eyes open and smiling), without Home's animation classes, so
 * it can be shown anywhere. Until art for later evolutions is drawn, they show the latest drawing
 * there is, the same as Home.
 */
export function AvatarFigure({ avatar, size = 72 }: { avatar: Avatar; size?: number }) {
  return (
    <svg viewBox="4 -30 212 252" width={size} height={(size * 252) / 212} aria-hidden="true" style={{ overflow: "visible" }}>
      {avatar.form === 0 ? <RongConEgg cracked={avatar.hatch !== "egg"} /> : <RongConDragon shards={!avatar.fullBody} />}
    </svg>
  );
}

const INK = "#5a3a28";

function RongConEgg({ cracked }: { cracked: boolean }) {
  return (
    <g>
      <ellipse cx="110" cy="208" rx="62" ry="9" fill="rgba(74,47,34,0.13)" />
      <path d="M110 -14 C 158 -14 194 66 194 128 C 194 180 158 210 110 210 C 62 210 26 180 26 128 C 26 66 62 -14 110 -14 Z" fill="#fffaf1" stroke={INK} strokeWidth="5" />
      <path d="M172 70 C 188 102 190 160 160 192 C 178 160 180 112 172 70 Z" fill="#f3e3d0" />
      <ellipse cx="72" cy="42" rx="12" ry="24" fill="#ffffff" opacity="0.8" transform="rotate(-25 72 42)" />
      <circle cx="70" cy="78" r="9" fill="#cfe6d8" />
      <circle cx="152" cy="40" r="7" fill="#fbe3b0" />
      <circle cx="160" cy="124" r="11" fill="#cfe6d8" />
      <circle cx="60" cy="150" r="8" fill="#fbe3b0" />
      <circle cx="118" cy="176" r="10" fill="#cfe6d8" />
      <circle cx="98" cy="20" r="6" fill="#cfe6d8" />
      <circle cx="92" cy="118" r="6" fill="#fbe3b0" />
      {cracked ? (
        <path
          d="M110 80 L109.7 72.5 L111 65 L109.5 58 L112 51 M110 80 L104.9 77.5 L99.5 75 L92 69 L85.5 67.5 M110 80 L115.6 79.5 L122 78.5 L130 69.5 L137 67 M110 80 L106.2 84.7 L100 92.5 L95 95 L91 101"
          fill="none"
          stroke="#8f6c56"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </g>
  );
}

function RongConDragon({ shards }: { shards: boolean }) {
  return (
    <g strokeLinejoin="round">
      <ellipse cx="110" cy="208" rx="58" ry="8" fill="rgba(74,47,34,0.13)" />
      {shards ? (
        <g>
          <path d="M34 207 L37.5 199.5 L42.5 201 L45 194.5 L50.5 198.5 L55.5 195.5 L58.5 200.5 L63 204 C 57 212 41 213 34 207 Z" fill="#fffaf1" stroke={INK} strokeWidth="2.5" />
          <path d="M158 207 L162 198.5 L166.5 201.5 L171.5 195 L176 199.5 L181.5 196.5 L183.5 201 L187 205 C 180 213 164 213 158 207 Z" fill="#fffaf1" stroke={INK} strokeWidth="2.5" />
        </g>
      ) : null}
      <path d="M82 172 C 50 182 24 168 26 146 C 28 132 42 128 48 136 C 42 142 44 156 58 158 C 68 159 76 156 84 152 Z" fill="#8cc4a5" stroke={INK} strokeWidth="3" />
      <path d="M26 146 C 15 140 17 127 28 125 C 28 133 34 137 33 144 Z" fill="#f2c35b" stroke={INK} strokeWidth="2.5" />
      <path d="M80 134 C 60 116 40 120 38 136 C 48 133 52 142 60 144 C 64 138 72 140 80 146 Z" fill="#f9cfb4" stroke={INK} strokeWidth="3" />
      <path d="M140 134 C 160 116 180 120 182 136 C 172 133 168 142 160 144 C 156 138 148 140 140 146 Z" fill="#f9cfb4" stroke={INK} strokeWidth="3" />
      <ellipse cx="90" cy="200" rx="15" ry="8" fill="#6fae8e" stroke={INK} strokeWidth="3" />
      <ellipse cx="130" cy="200" rx="15" ry="8" fill="#6fae8e" stroke={INK} strokeWidth="3" />
      <path d="M110 116 C 146 116 158 150 154 174 C 151 194 134 202 110 202 C 86 202 69 194 66 174 C 62 150 74 116 110 116 Z" fill="#8cc4a5" stroke={INK} strokeWidth="3.5" />
      <path d="M110 136 C 127 136 135 155 133 172 C 131 187 122 194 110 194 C 98 194 89 187 87 172 C 85 155 93 136 110 136 Z" fill="#fde3cf" stroke={INK} strokeWidth="2.5" />
      <path d="M92 154 Q110 159 128 154 M90 168 Q110 173 130 168 M93 182 Q110 187 127 182" fill="none" stroke="#e9bfa0" strokeWidth="2.5" strokeLinecap="round" />
      <path d="M78 152 C 66 156 64 168 72 171 C 78 172 83 164 84 157" fill="#8cc4a5" stroke={INK} strokeWidth="3" />
      <path d="M142 152 C 154 156 156 168 148 171 C 142 172 137 164 136 157" fill="#8cc4a5" stroke={INK} strokeWidth="3" />
      <path d="M84 48 C 76 30 82 18 92 20 C 96 30 95 40 93 50 Z" fill="#f2c35b" stroke={INK} strokeWidth="3" />
      <path d="M136 48 C 144 30 138 18 128 20 C 124 30 125 40 127 50 Z" fill="#f2c35b" stroke={INK} strokeWidth="3" />
      <ellipse cx="110" cy="84" rx="56" ry="46" fill="#8cc4a5" stroke={INK} strokeWidth="3.5" />
      <path d="M86 46 L92 32 L100 42 L108 28 L116 41 L124 29 L131 40 L136 34 C 139 46 126 54 110 54 C 96 54 86 51 86 46 Z" fill="#fffaf1" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="74" cy="96" rx="9" ry="6" fill="#f28b74" opacity="0.55" />
      <ellipse cx="146" cy="96" rx="9" ry="6" fill="#f28b74" opacity="0.55" />
      <ellipse cx="90" cy="80" rx="11" ry="13" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
      <ellipse cx="130" cy="80" rx="11" ry="13" fill="#ffffff" stroke={INK} strokeWidth="2.5" />
      <circle cx="91" cy="82" r="7" fill="#3a2418" />
      <circle cx="94" cy="78" r="2.5" fill="#ffffff" />
      <circle cx="131" cy="82" r="7" fill="#3a2418" />
      <circle cx="134" cy="78" r="2.5" fill="#ffffff" />
      <ellipse cx="110" cy="104" rx="30" ry="17" fill="#a9d6bc" stroke={INK} strokeWidth="3" />
      <ellipse cx="101" cy="99" rx="2.6" ry="2" fill={INK} />
      <ellipse cx="119" cy="99" rx="2.6" ry="2" fill={INK} />
      <path d="M100 109 Q110 117 120 109" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      <path d="M82 104 C 64 106 56 116 62 124 C 66 129 73 124 69 120" fill="none" stroke="#f2c35b" strokeWidth="3" strokeLinecap="round" />
      <path d="M138 104 C 156 106 164 116 158 124 C 154 129 147 124 151 120" fill="none" stroke="#f2c35b" strokeWidth="3" strokeLinecap="round" />
    </g>
  );
}
