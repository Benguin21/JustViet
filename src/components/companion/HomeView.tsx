// The homepage's markup, converted from the HomeDraft board on the JustViet design canvas
// (https://claude.ai/artifact/5LFnFo85BXbFJk6swP39kQ) by home-board-to-app.py. It follows the
// board one to one (classes, inline styles, structure) so the two can be compared side by side;
// HomeCompanion works out every value it shows. The board's header is the app's AppHeader.
import Link from "next/link";
import { Fragment, type CSSProperties } from "react";
import { MENU_ART, TEACHER_ART } from "./art";
import type { HomeRefs, HomeVals } from "./HomeCompanion";

const css = (o: Record<string, string | number>) => o as CSSProperties;
const HIDDEN_ART = css({ position: "absolute", width: 0, height: 0, overflow: "hidden" });

export function HomeView({ v, at }: { v: HomeVals; at: HomeRefs }) {
  const { root, talk, stage, dragon, guide, tiles } = at;
  return (
    <div
      className="jv-root"
      ref={root}
      style={css({ flex: "1 0 auto", display: "flex", flexDirection: "column", background: "#fffaf1", color: "#4a2f22", fontFamily: "var(--font-body), sans-serif", lineHeight: "normal" })}
    >
      <svg className="jv-menu-art" width="0" height="0" aria-hidden="true" focusable="false" style={HIDDEN_ART}>
        <defs dangerouslySetInnerHTML={{ __html: MENU_ART }} />
      </svg>
      <svg className="jv-teach-art" width="0" height="0" aria-hidden="true" focusable="false" style={HIDDEN_ART}>
        <defs dangerouslySetInnerHTML={{ __html: TEACHER_ART }} />
      </svg>
      <main style={css({ width: "100%", maxWidth: "1080px", margin: "0 auto", padding: "28px 20px 56px", display: "flex", flexDirection: "column", gap: "40px" })}>
        <section aria-labelledby="hero-title" className={v.heroClass} style={css({ position: "relative", overflow: "hidden", borderRadius: "32px", background: "#fff3e6", border: "2px solid #f6dcc6", padding: `28px 20px ${v.heroPad}px`, marginBottom: `${v.heroPull}px`, display: "flex", flexDirection: "column", gap: "20px" })}>
          <svg aria-hidden="true" viewBox="0 0 1000 140" preserveAspectRatio="none" style={css({ position: "absolute", left: "0", bottom: "0", width: "100%", height: "150px", pointerEvents: "none" })}>
            <path d="M0 70 C 120 30 230 40 330 66 C 430 92 520 40 640 48 C 760 56 850 96 1000 60 L1000 140 L0 140 Z" fill="#e3efe4" />
            <path d="M0 104 C 140 78 260 92 380 104 C 520 118 610 84 760 92 C 860 98 930 116 1000 104 L1000 140 L0 140 Z" fill="#d3e7d8" />
            <path d="M60 112 q40 -8 80 0 M640 118 q50 -9 100 0 M820 104 q30 -6 60 0" fill="none" stroke="#b5d4bf" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <svg aria-hidden="true" viewBox="0 0 90 96" style={css({ position: "absolute", top: "0", right: "14px", width: "66px", height: "70px", pointerEvents: "none" })}>
            <path d="M24 0 V18 M66 0 V30" stroke="#a7744a" strokeWidth="2" />
            <g>
              <ellipse cx="24" cy="36" rx="16" ry="18" fill="#f15b48" stroke="#5a3a28" strokeWidth="2.5" />
              <path d="M12 26 h24 M10 36 h28 M12 46 h24" stroke="#f2c35b" strokeWidth="2" />
              <rect x="17" y="15" width="14" height="5" rx="2" fill="#f2c35b" stroke="#5a3a28" strokeWidth="2" />
              <rect x="17" y="52" width="14" height="5" rx="2" fill="#f2c35b" stroke="#5a3a28" strokeWidth="2" />
              <path d="M24 57 V68 M21 60 V66 M27 60 V66" stroke="#f15b48" strokeWidth="2" strokeLinecap="round" />
            </g>
            <g>
              <ellipse cx="66" cy="50" rx="13" ry="15" fill="#f2c35b" stroke="#5a3a28" strokeWidth="2.5" />
              <path d="M56 42 h20 M55 50 h22 M56 58 h20" stroke="#f15b48" strokeWidth="2" />
              <rect x="60" y="30" width="12" height="5" rx="2" fill="#f15b48" stroke="#5a3a28" strokeWidth="2" />
              <rect x="60" y="64" width="12" height="5" rx="2" fill="#f15b48" stroke="#5a3a28" strokeWidth="2" />
              <path d="M66 69 V80 M63 72 V78 M69 72 V78" stroke="#f2c35b" strokeWidth="2" strokeLinecap="round" />
            </g>
          </svg>
          <div style={css({ position: "relative", display: "flex", flexDirection: "column", gap: "6px", paddingRight: "64px" })}>
            <span style={css({ alignSelf: "flex-start", display: "inline-flex", alignItems: "center", gap: "6px", borderRadius: "9999px", background: "#e6f2ea", color: "#2f6b55", padding: "4px 12px", fontSize: "12px", lineHeight: "16px", fontWeight: "800", letterSpacing: "0.025em", textTransform: "uppercase" })}>
              Con giáp của bạn: Thìn · Year of the Dragon
            </span>
            <h1 id="hero-title" style={css({ margin: "0", fontFamily: "var(--font-heading), sans-serif", fontSize: "32px", lineHeight: "38px", fontWeight: "800", color: "#4a2f22" })}>
              Hello bạn!
            </h1>
            <p style={css({ margin: "0", fontSize: "16px", lineHeight: "24px", fontWeight: "600", color: "#6b4a38" })}>
              Rồng Con is hungry. Finish today’s goals to feed your dragon.
            </p>
          </div>
          <div style={css({ position: "relative", display: "flex", flexDirection: "column", gap: "12px" })}>
            <div style={css({ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: "8px" })}>
              <h2 style={css({ margin: "0", fontFamily: "var(--font-heading), sans-serif", fontSize: "20px", lineHeight: "28px", fontWeight: "800", color: "#4a2f22" })}>
                Mục tiêu hôm nay · Today’s goals
              </h2>
              <span style={css({ fontSize: "14px", lineHeight: "20px", fontWeight: "800", color: "#2f6b55" })}>{v.servedText}</span>
            </div>
            {v.hasGoals ? (
              <>
                <div style={css({ width: "100%", maxWidth: v.goalsMax, margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(280px, 100%), 1fr))", gap: "14px" })}>
                  {v.goals.map((g, gi) => (
                    <Fragment key={gi}>
                      <div className={g.cardClass} style={css({ position: "relative", display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px 10px 10px", borderRadius: "24px" })}>
                        <Link href={g.href} className="goal-link" style={css({ flexGrow: "1", minWidth: "0", display: "flex", alignItems: "center", gap: "12px", textDecoration: "none", color: "#4a2f22", minHeight: "76px" })}>
                          <span className={g.tileClass} ref={tiles[g.id]} style={css({ width: "76px", height: "76px", flexShrink: "0", borderRadius: "18px", background: "#fff6ea", display: "flex", alignItems: "center", justifyContent: "center" })}>
                            <svg className="food" viewBox="0 0 80 80" width="70" height="70" aria-hidden="true">
                              <use href={`#jvArt-${g.key}-back`} />
                              <g opacity={g.oFull}><use href={`#jvArt-${g.key}-full`} /></g>
                              <g opacity={g.oDone}><use href={`#jvArt-${g.key}-done`} /></g>
                              <use href={`#jvArt-${g.key}-front`} />
                            </svg>
                          </span>
                          <span style={css({ minWidth: "0", display: "flex", flexDirection: "column", gap: "1px" })}>
                            <span style={css({ fontSize: "15px", lineHeight: "20px", fontWeight: "900", letterSpacing: "0.04em", textTransform: "uppercase", color: "#2f6b55" })}>
                              {g.section}
                            </span>
                            <span style={css({ fontFamily: "var(--font-heading), sans-serif", fontSize: "20px", lineHeight: "26px", fontWeight: "800", color: "#4a2f22" })}>
                              {g.foodVi}
                            </span>
                            <span style={css({ fontSize: "14px", lineHeight: "20px", fontWeight: "700", color: "#6b4a38" })}>{g.progressText}</span>
                            <span className="goal-status">
                              {g.statusLines.map((t, ti) => (
                                <Fragment key={ti}>
                                  <span className={t.cls}>{t.text}</span>
                                </Fragment>
                              ))}
                            </span>
                          </span>
                        </Link>
                        <button type="button" className={g.checkClass} role="checkbox" aria-checked={g.checkedAttr} aria-disabled={g.disabledAttr} aria-label={g.checkLabel} onClick={g.toggle} style={css({ width: "52px", height: "52px", flexShrink: "0", border: "0", padding: "0", background: "transparent", display: "flex", alignItems: "center", justifyContent: "center" })}>
                          <svg viewBox="0 0 52 52" width="52" height="52" aria-hidden="true" style={css({ overflow: "visible" })}>
                            <circle className="ready-ring" cx="26" cy="26" r="22.5" fill="none" stroke="#f2c35b" strokeWidth="3" />
                            <circle className="check-ring" cx="26" cy="26" r="17" fill="#ffffff" stroke="#a8836b" strokeWidth="3" />
                            <circle className="check-arc" cx="26" cy="26" r="17" fill="none" stroke="#4f9a78" strokeWidth="4" strokeLinecap="round" strokeDasharray={g.dash} opacity={g.oArc} transform="rotate(-90 26 26)" />
                            <path className="check-preview" d="M18 26.5 l5.5 5.5 l10.5 -11.5" fill="none" stroke="#4f9a78" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                            <g className="check-fill" opacity={g.oCheck}>
                              <circle cx="26" cy="26" r="18.5" fill="#4f9a78" stroke="#2f6b55" strokeWidth="2" />
                              <path d="M18 26.5 l5.5 5.5 l10.5 -11.5" fill="none" stroke="#ffffff" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
                            </g>
                          </svg>
                        </button>
                        {g.sparkle ? (
                          <>
                            <svg className="sparkle" viewBox="0 0 20 20" width="20" height="20" aria-hidden="true" style={css({ left: "8px", top: "-6px" })}>
                              <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="1.2" />
                            </svg>
                            <svg className="sparkle" viewBox="0 0 20 20" width="14" height="14" aria-hidden="true" style={css({ left: "72px", top: "2px", animationDelay: "120ms" })}>
                              <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#f15b48" stroke="#5a3a28" strokeWidth="1.2" />
                            </svg>
                            <svg className="sparkle" viewBox="0 0 20 20" width="16" height="16" aria-hidden="true" style={css({ right: "10px", top: "-8px", animationDelay: "220ms" })}>
                              <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#7fb89a" stroke="#5a3a28" strokeWidth="1.2" />
                            </svg>
                          </>
                        ) : null}
                      </div>
                    </Fragment>
                  ))}
                </div>
              </>
            ) : null}
            {v.noGoals ? (
              <>
                <div className={v.emptyClass} style={css({ width: "100%", maxWidth: "560px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "10px", padding: "18px 20px 20px", borderRadius: "24px", textAlign: "center" })}>
                  <span style={css({ width: "76px", height: "76px", borderRadius: "18px", background: "#fff6ea", display: "flex", alignItems: "center", justifyContent: "center" })}>
                    <svg viewBox="0 0 80 80" width="70" height="70" aria-hidden="true">
                      <ellipse cx="40" cy="63" rx="28" ry="4.5" fill="rgba(74,47,34,0.12)" />
                      <ellipse cx="40" cy="51" rx="33" ry="12.5" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2.5" />
                      <ellipse cx="40" cy="49.5" rx="21" ry="7" fill="#f4e6d1" stroke="#e9bfa0" strokeWidth="2" />
                      <path d="M47 46 L69 20 M52 48 L73 24" stroke="#a7744a" strokeWidth="3" strokeLinecap="round" />
                      <path d="M18 22 l1.6 4 l4 1.6 l-4 1.6 l-1.6 4 l-1.6 -4 l-4 -1.6 l4 -1.6 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="1.2" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={css({ display: "flex", flexDirection: "column", alignItems: "center", gap: "2px" })}>
                    <span lang="vi" style={css({ fontSize: "15px", lineHeight: "20px", fontWeight: "900", letterSpacing: "0.04em", textTransform: "uppercase", color: "#2f6b55" })}>
                      Thực đơn trống
                    </span>
                    <span style={css({ fontFamily: "var(--font-heading), sans-serif", fontSize: "20px", lineHeight: "26px", fontWeight: "800", color: "#4a2f22" })}>
                      Let’s get started! 🌱
                    </span>
                    <span style={css({ maxWidth: "440px", fontSize: "14px", lineHeight: "20px", fontWeight: "700", color: "#6b4a38", textWrap: "balance" })}>
                      Your adventure starts here! Set your daily goals and discover what Rồng Con asks for on today’s menu!
                    </span>
                  </span>
                  <Link href="/goals" className="goals-cta">Set Up My Goals</Link>
                </div>
              </>
            ) : null}
          </div>
          <div style={css({ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" })}>
            <div className={v.talkClass} ref={talk} style={css({ minHeight: "84px", width: "100%", display: "flex", alignItems: "flex-end", justifyContent: "center", "--rest": `${v.talkRest}px`, "--lift": `${v.talkLift}px`, "--clear": `${v.talkClear}px`, "--room": `${v.talkRoom}px` })}>
              {v.hasBubble ? (
                <>
                  <div role="status" aria-live="polite" className={v.bubbleClass} style={css({ maxWidth: "320px", display: "flex", flexDirection: "column", alignItems: "center", gap: "2px", background: "#ffffff", border: "2px solid #5a3a28", borderRadius: "22px", padding: "10px 18px", textAlign: "center", boxShadow: "0 4px 0 rgba(74, 47, 34, 0.08)" })}>
                    <span lang="vi" style={css({ fontFamily: "var(--font-heading), sans-serif", fontSize: "20px", lineHeight: "26px", fontWeight: "800", color: "#4a2f22" })}>
                      {v.bubbleVi}
                    </span>
                    <span style={css({ fontSize: "13px", lineHeight: "18px", fontWeight: "700", color: "#6b4a38" })}>{v.bubbleEn}</span>
                  </div>
                </>
              ) : null}
            </div>
            <div className="companion-stage" ref={stage} style={css({ marginTop: `${v.clearNow}px` })}>
              {v.showConfetti ? (
                <>
                  <span className="confetti-burst" aria-hidden="true">
                    {v.confetti.map((c, ci) => (
                      <Fragment key={ci}>
                        <span className="confetti" style={css({ left: `${c.x}px`, top: `${c.y}px`, "--dx": `${c.dx}px`, "--up": `${c.up}px`, "--fall": `${c.fall}px`, "--rot": `${c.rot}deg`, animationDuration: `${c.dur}ms`, animationDelay: `${c.delay}ms` })}>
                          <span className="confetti-bit" style={css({ width: `${c.w}px`, height: `${c.h}px`, borderRadius: c.r, background: c.color, animationDuration: `${c.flip}ms` })} />
                        </span>
                      </Fragment>
                    ))}
                  </span>
                </>
              ) : null}
              <button type="button" className="dragon-btn" ref={dragon} aria-label={v.dragonLabel} onClick={v.poke} style={css({ position: "relative", width: "220px", height: "250px", border: "0", padding: "0", background: "transparent", cursor: "pointer" })}>
                <div className={v.dragonClass} style={css({ width: "220px", height: "250px", transform: `scale(${v.dragonScale})`, transformOrigin: "50% 92%", transition: "transform .6s cubic-bezier(.3,1.6,.5,1)" })}>
                  <svg viewBox="0 -40 220 260" width="220" height="250" aria-hidden="true" style={css({ overflow: "visible" })}>
                    <defs>
                      <mask id="jvEggHole" maskUnits="userSpaceOnUse" x="-20" y="-60" width="260" height="300">
                        <rect x="-20" y="-60" width="260" height="300" fill="#ffffff" />
                        <path d="M-13.5 -5 L-10 -10.5 L-6.5 -9.5 L-3.5 -14.5 L2 -13 L4.5 -15 L9 -11.5 L14 -7 L13 -2.5 L16.5 2 L13.5 6.5 L11 12.5 L6 11 L2.5 14.5 L-2 12 L-7.5 13.5 L-10 8.5 L-15.5 4 L-14 0.5 Z" fill="#000000" style={css({ transformBox: "view-box", transformOrigin: "0 0", transform: `translate(131px, 80px) scale(${v.holeScale})`, transition: "transform .8s ease" })} />
                      </mask>
                      <g id="jvEggShell">
                        <path d="M110 -14 C 158 -14 194 66 194 128 C 194 180 158 210 110 210 C 62 210 26 180 26 128 C 26 66 62 -14 110 -14 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="3.5" />
                        <path d="M172 70 C 188 102 190 160 160 192 C 178 160 180 112 172 70 Z" fill="#f3e3d0" />
                        <ellipse cx="72" cy="42" rx="12" ry="24" fill="#ffffff" opacity="0.8" transform="rotate(-25 72 42)" />
                        <circle cx="70" cy="78" r="9" fill="#cfe6d8" />
                        <circle cx="152" cy="40" r="7" fill="#fbe3b0" />
                        <circle cx="160" cy="124" r="11" fill="#cfe6d8" />
                        <circle cx="60" cy="150" r="8" fill="#fbe3b0" />
                        <circle cx="118" cy="176" r="10" fill="#cfe6d8" />
                        <circle cx="98" cy="20" r="6" fill="#cfe6d8" />
                        <circle cx="92" cy="118" r="6" fill="#fbe3b0" />
                      </g>
                      <clipPath id="jvCapClip" clipPathUnits="userSpaceOnUse">
                        <polygon points="10,-40 230,-40 230,84.3 187.2,84.3 183.5,84.2 178.9,83.4 174.9,85.4 170.7,86.9 166.6,87 161.7,87.4 155.8,87.6 151.4,88.4 147.7,87 142.7,86.1 139.2,87.5 135,88.2 131,85.5 127,89.3 123.1,90 119.3,90.7 115,91.6 109.4,93.7 104.4,92.6 100.2,92.2 96,93.4 92.6,95.3 87.9,93.2 82.7,91.8 78.2,93 73.7,94.9 69.8,94.7 66.2,95 62.5,94.7 58.6,94.4 53.4,94.4 48.4,94.4 44.1,92.2 39.8,90.2 36.3,90.8 31.3,91.2 -10,91.2" />
                      </clipPath>
                      <clipPath id="jvBotLClip" clipPathUnits="userSpaceOnUse">
                        <polygon points="-10,91.2 31.3,91.2 36.3,90.8 39.8,90.2 44.1,92.2 48.4,94.4 53.4,94.4 58.6,94.4 62.5,94.7 66.2,95 69.8,94.7 73.7,94.9 78.2,93 82.7,91.8 87.9,93.2 92.6,95.3 96,93.4 100.2,92.2 104.4,92.6 109.4,93.7 108.6,98 108,104 109.5,108.6 111.3,113.7 113,117.5 111.1,121.3 108.9,127.2 107.5,131 109,136.4 110.8,140.1 112.5,146 110.3,151.1 109,155.8 107,161 108.7,166 110.3,170.3 112,176 110.3,182 109.5,186.7 108.5,192 109,197.5 109.1,201.2 109.8,206 110,211 110,230 -10,230" />
                      </clipPath>
                      <clipPath id="jvBotRClip" clipPathUnits="userSpaceOnUse">
                        <polygon points="109.4,93.7 115,91.6 119.3,90.7 123.1,90 127,89.3 131,85.5 135,88.2 139.2,87.5 142.7,86.1 147.7,87 151.4,88.4 155.8,87.6 161.7,87.4 166.6,87 170.7,86.9 174.9,85.4 178.9,83.4 183.5,84.2 187.2,84.3 230,84.3 230,230 110,230 110,211 109.8,206 109.1,201.2 109,197.5 108.5,192 109.5,186.7 110.3,182 112,176 110.3,170.3 108.7,166 107,161 109,155.8 110.3,151.1 112.5,146 110.8,140.1 109,136.4 107.5,131 108.9,127.2 111.1,121.3 113,117.5 111.3,113.7 109.5,108.6 108,104 108.6,98" />
                      </clipPath>
                    </defs>
                    <g className="burst burst-l">
                      <g clipPath="url(#jvBotLClip)">
                        <use href="#jvEggShell" />
                        <use href="#jvEggCracks" />
                      </g>
                      <path d="M31.3 91.2 L36.3 90.8 L39.8 90.2 L44.1 92.2 L48.4 94.4 L53.4 94.4 L58.6 94.4 L62.5 94.7 L66.2 95 L69.8 94.7 L73.7 94.9 L78.2 93 L82.7 91.8 L87.9 93.2 L92.6 95.3 L96 93.4 L100.2 92.2 L104.4 92.6 L109.4 93.7 L108.6 98 L108 104 L109.5 108.6 L111.3 113.7 L113 117.5 L111.1 121.3 L108.9 127.2 L107.5 131 L109 136.4 L110.8 140.1 L112.5 146 L110.3 151.1 L109 155.8 L107 161 L108.7 166 L110.3 170.3 L112 176 L110.3 182 L109.5 186.7 L108.5 192 L109 197.5 L109.1 201.2 L109.8 206 L110 211" fill="none" stroke="#5a3a28" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-r">
                      <g clipPath="url(#jvBotRClip)">
                        <use href="#jvEggShell" />
                        <use href="#jvEggCracks" />
                      </g>
                      <path d="M109.4 93.7 L115 91.6 L119.3 90.7 L123.1 90 L127 89.3 L131 85.5 L135 88.2 L139.2 87.5 L142.7 86.1 L147.7 87 L151.4 88.4 L155.8 87.6 L161.7 87.4 L166.6 87 L170.7 86.9 L174.9 85.4 L178.9 83.4 L183.5 84.2 L187.2 84.3 M109.4 93.7 L108.6 98 L108 104 L109.5 108.6 L111.3 113.7 L113 117.5 L111.1 121.3 L108.9 127.2 L107.5 131 L109 136.4 L110.8 140.1 L112.5 146 L110.3 151.1 L109 155.8 L107 161 L108.7 166 L110.3 170.3 L112 176 L110.3 182 L109.5 186.7 L108.5 192 L109 197.5 L109.1 201.2 L109.8 206 L110 211" fill="none" stroke="#5a3a28" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <g id="jvDragonArt" className="jv-root">
                      <g className={v.dragonClass}>
                        <ellipse cx="110" cy="208" rx="58" ry="8" fill="rgba(74,47,34,0.13)" />
                        <g className="shards">
                          <path d="M34 207 L37.5 199.5 L42.5 201 L45 194.5 L50.5 198.5 L55.5 195.5 L58.5 200.5 L63 204 C 57 212 41 213 34 207 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                          <path d="M158 207 L162 198.5 L166.5 201.5 L171.5 195 L176 199.5 L181.5 196.5 L183.5 201 L187 205 C 180 213 164 213 158 207 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                          <circle cx="47" cy="206" r="2" fill="#cfe6d8" />
                          <circle cx="173" cy="206" r="2" fill="#fbe3b0" />
                        </g>
                        <g className="crumbs">
                          <path className="crumb" d="M54 202.9 L57.4 203.4 L62.7 206.2 L62 208 L59.7 210.6 L53.2 209.1 L50.9 205.5 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="1.3" strokeLinejoin="round" opacity={v.cv.crumbOn_c0} style={css({ "--on": v.cv.crumbOn_c0 })} />
                          <path className="crumb" d="M160.1 204.2 L165.9 206 L169.3 208.7 L166.4 210.1 L163.6 211.9 L160.4 209.7 L157.8 206.6 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="1.3" strokeLinejoin="round" opacity={v.cv.crumbOn_c1} style={css({ "--on": v.cv.crumbOn_c1 })} />
                          <path className="crumb" d="M79.8 215.9 L81 212.8 L84.4 211.2 L86.8 212 L88.2 215 L86.3 215.9 L81.4 216.5 Z" fill="#cfe6d8" stroke="#5a3a28" strokeWidth="1.3" strokeLinejoin="round" opacity={v.cv.crumbOn_c2} style={css({ "--on": v.cv.crumbOn_c2 })} />
                          <path className="crumb" d="M134.8 214.7 L138.9 212.1 L142.3 211.2 L143.6 213.6 L143.6 217.1 L140.4 217.5 L136.1 218 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="1.3" strokeLinejoin="round" opacity={v.cv.crumbOn_c3} style={css({ "--on": v.cv.crumbOn_c3 })} />
                          <path className="crumb" d="M178.6 208.9 L179.1 210.9 L177.8 213.8 L175.8 212.9 L172.4 211.8 L172.9 210.4 L176.1 208.3 Z" fill="#fbe3b0" stroke="#5a3a28" strokeWidth="1.3" strokeLinejoin="round" opacity={v.cv.crumbOn_c4} style={css({ "--on": v.cv.crumbOn_c4 })} />
                        </g>
                        <g className="dg-all">
                          <ellipse className="feed-glow" cx="110" cy="98" rx="98" ry="124" fill="#fde7a8" stroke="#f2c35b" strokeWidth="6" strokeOpacity="0.5" />
                          <g className="egg-wobble">
                            <g className="dg-tail">
                              <path d="M82 172 C 50 182 24 168 26 146 C 28 132 42 128 48 136 C 42 142 44 156 58 158 C 68 159 76 156 84 152 Z" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                              <path d="M26 146 C 15 140 17 127 28 125 C 28 133 34 137 33 144 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                            </g>
                            <g className="dg-wing-l">
                              <path d="M80 134 C 60 116 40 120 38 136 C 48 133 52 142 60 144 C 64 138 72 140 80 146 Z" fill="#f9cfb4" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                            </g>
                            <g className="dg-wing-r">
                              <path d="M140 134 C 160 116 180 120 182 136 C 172 133 168 142 160 144 C 156 138 148 140 140 146 Z" fill="#f9cfb4" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                            </g>
                            <ellipse cx="90" cy="200" rx="15" ry="8" fill="#6fae8e" stroke="#5a3a28" strokeWidth="3" />
                            <ellipse cx="130" cy="200" rx="15" ry="8" fill="#6fae8e" stroke="#5a3a28" strokeWidth="3" />
                            <g className="dg-body">
                              <path d="M110 116 C 146 116 158 150 154 174 C 151 194 134 202 110 202 C 86 202 69 194 66 174 C 62 150 74 116 110 116 Z" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="3.5" strokeLinejoin="round" />
                              <path d="M110 136 C 127 136 135 155 133 172 C 131 187 122 194 110 194 C 98 194 89 187 87 172 C 85 155 93 136 110 136 Z" fill="#fde3cf" stroke="#5a3a28" strokeWidth="2.5" />
                              <path d="M92 154 Q110 159 128 154 M90 168 Q110 173 130 168 M93 182 Q110 187 127 182" fill="none" stroke="#e9bfa0" strokeWidth="2.5" strokeLinecap="round" />
                              <path d="M78 152 C 66 156 64 168 72 171 C 78 172 83 164 84 157" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                              <path d="M142 152 C 154 156 156 168 148 171 C 142 172 137 164 136 157" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                            </g>
                            <g className="dg-head">
                              <path d="M84 48 C 76 30 82 18 92 20 C 96 30 95 40 93 50 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                              <path d="M136 48 C 144 30 138 18 128 20 C 124 30 125 40 127 50 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="3" strokeLinejoin="round" />
                              <ellipse cx="110" cy="84" rx="56" ry="46" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="3.5" />
                              <path d="M86 46 L92 32 L100 42 L108 28 L116 41 L124 29 L131 40 L136 34 C 139 46 126 54 110 54 C 96 54 86 51 86 46 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                              <circle cx="100" cy="47" r="2" fill="#f2c35b" />
                              <circle cx="121" cy="45" r="2.4" fill="#f2c35b" />
                              <ellipse className="cheek" cx="74" cy="96" rx="9" ry="6" fill="#f28b74" opacity="0.55" />
                              <ellipse className="cheek" cx="146" cy="96" rx="9" ry="6" fill="#f28b74" opacity="0.55" />
                              <g className="eyes-open-g">
                                <ellipse cx="90" cy="80" rx="11" ry="13" fill="#ffffff" stroke="#5a3a28" strokeWidth="2.5" />
                                <ellipse cx="130" cy="80" rx="11" ry="13" fill="#ffffff" stroke="#5a3a28" strokeWidth="2.5" />
                                <g className="dg-pupil">
                                  <circle cx="91" cy="82" r="7" fill="#3a2418" />
                                  <circle cx="94" cy="78" r="2.5" fill="#ffffff" />
                                </g>
                                <g className="dg-pupil">
                                  <circle cx="131" cy="82" r="7" fill="#3a2418" />
                                  <circle cx="134" cy="78" r="2.5" fill="#ffffff" />
                                </g>
                              </g>
                              <g className="eyes-half-lids">
                                <path d="M78.5 79 A11.5 11 0 0 1 101.5 79 Z" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                                <path d="M118.5 79 A11.5 11 0 0 1 141.5 79 Z" fill="#8cc4a5" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                              </g>
                              <g className="eyes-happy-g">
                                <path d="M80 84 q10 -12 20 0 M120 84 q10 -12 20 0" fill="none" stroke="#5a3a28" strokeWidth="4" strokeLinecap="round" />
                              </g>
                              <ellipse cx="110" cy="104" rx="30" ry="17" fill="#a9d6bc" stroke="#5a3a28" strokeWidth="3" />
                              <ellipse cx="101" cy="99" rx="2.6" ry="2" fill="#5a3a28" />
                              <ellipse cx="119" cy="99" rx="2.6" ry="2" fill="#5a3a28" />
                              <g className="mouth-smile-g">
                                <path d="M100 109 Q110 117 120 109" fill="none" stroke="#5a3a28" strokeWidth="3" strokeLinecap="round" />
                              </g>
                              <g className="mouth-open-g">
                                <path d="M99 107 Q110 125 121 107 Z" fill="#c0503f" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                                <path d="M104 115 Q110 112 116 115 Q110 121 104 115 Z" fill="#f28b74" />
                              </g>
                              <g className="mouth-chomp-g">
                                <g className="chomp-open">
                                  <path d="M100 107 Q110 123 120 107 Z" fill="#c0503f" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" />
                                </g>
                                <g className="chomp-shut">
                                  <path d="M101 110 Q110 114 119 110" fill="none" stroke="#5a3a28" strokeWidth="3" strokeLinecap="round" />
                                </g>
                              </g>
                              <g className="dg-whisker-l">
                                <path d="M82 104 C 64 106 56 116 62 124 C 66 129 73 124 69 120" fill="none" stroke="#f2c35b" strokeWidth="3" strokeLinecap="round" />
                              </g>
                              <g className="dg-whisker-r">
                                <path d="M138 104 C 156 106 164 116 158 124 C 154 129 147 124 151 120" fill="none" stroke="#f2c35b" strokeWidth="3" strokeLinecap="round" />
                              </g>
                            </g>
                            <g className="egg-closed">
                              <g className="egg-inside">
                                <ellipse cx="131" cy="81" rx="26" ry="25" fill="#9a735d" />
                                <ellipse cx="131" cy="87" rx="23" ry="18" fill="#6f9f86" />
                                <ellipse cx="119.5" cy="88.5" rx="3.6" ry="2.3" fill="#f28b74" opacity="0.55" />
                                <ellipse cx="142.5" cy="88.5" rx="3.6" ry="2.3" fill="#f28b74" opacity="0.55" />
                                <g className="peek-eye peek-open">
                                  <g className="peek-pupil">
                                    <ellipse cx="125" cy="81.5" rx="3.8" ry="4.6" fill="#2b1c15" />
                                    <circle cx="126.3" cy="79.6" r="1.35" fill="#ffffff" />
                                    <ellipse cx="137" cy="81.5" rx="3.8" ry="4.6" fill="#2b1c15" />
                                    <circle cx="138.3" cy="79.6" r="1.35" fill="#ffffff" />
                                  </g>
                                </g>
                                <path className="peek-happy" d="M121.5 83 q3.5 -5 7 0 M133.5 83 q3.5 -5 7 0" fill="none" stroke="#2b1c15" strokeWidth="2.4" strokeLinecap="round" />
                                <path d="M-13.5 -5 L-10 -10.5 L-6.5 -9.5 L-3.5 -14.5 L2 -13 L4.5 -15 L9 -11.5 L14 -7 L13 -2.5 L16.5 2 L13.5 6.5 L11 12.5 L6 11 L2.5 14.5 L-2 12 L-7.5 13.5 L-10 8.5 L-15.5 4 L-14 0.5 Z" fill="none" stroke="#5a3a28" strokeOpacity="0.2" strokeWidth="6" strokeLinejoin="round" style={css({ transformBox: "view-box", transformOrigin: "0 0", transform: `translate(131px, 80px) scale(${v.holeScale})`, transition: "transform .8s ease" })} />
                              </g>
                              <g mask="url(#jvEggHole)">
                                <use href="#jvEggShell" />
                                <g id="jvEggCracks" className="cracks" fill="none" stroke={v.crackInk} strokeLinecap="round" strokeLinejoin="round" style={css({ "--ck": v.crackK })}>
                                  <path className="crack" d="M131 80 L130.7 76.6 L130.5 72.5 L131.6 68.5 L132 65" pathLength="100" strokeDashoffset={v.cv.crackOff_r2a} style={css({ strokeWidth: "calc(var(--ck) * 2.0px)" })} />
                                  <path className="crack" d="M132 65 L130.5 58 L133 51" pathLength="100" strokeDashoffset={v.cv.crackOff_r2b} style={css({ strokeWidth: "calc(var(--ck) * 1.55px)" })} />
                                  <path className="crack" d="M133 51 L131 44.5 L131.8 41.2 L133.5 37" pathLength="100" strokeDashoffset={v.cv.crackOff_r2c} style={css({ strokeWidth: "calc(var(--ck) * 1.1px)" })} />
                                  <path className="crack" d="M131 80 L127.2 84.7 L123.5 88.5 L121 92.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r5a} style={css({ strokeWidth: "calc(var(--ck) * 1.9px)" })} />
                                  <path className="crack" d="M121 92.5 L116 95 L112 101 L110.5 106" pathLength="100" strokeDashoffset={v.cv.crackOff_r5b} style={css({ strokeWidth: "calc(var(--ck) * 1.2px)" })} />
                                  <path className="crack" d="M131 80 L136.6 79.5 L143 78.5 L147.5 74.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r3a} style={css({ strokeWidth: "calc(var(--ck) * 1.9px)" })} />
                                  <path className="crack" d="M147.5 74.5 L151 69.5 L158 67 L160.7 63.7 L163 61" pathLength="100" strokeDashoffset={v.cv.crackOff_r3b} style={css({ strokeWidth: "calc(var(--ck) * 1.3px)" })} />
                                  <path className="crack" d="M131 80 L125.9 77.5 L120.5 75 L117 73.5 L113 69" pathLength="100" strokeDashoffset={v.cv.crackOff_r1a} style={css({ strokeWidth: "calc(var(--ck) * 2.0px)" })} />
                                  <path className="crack" d="M113 69 L106.5 66.5 L100.5 67.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r1b} style={css({ strokeWidth: "calc(var(--ck) * 1.5px)" })} />
                                  <path className="crack" d="M100.5 67.5 L96.8 64.2 L94 61.5 L89 58.5 L85.5 52" pathLength="100" strokeDashoffset={v.cv.crackOff_r1c} style={css({ strokeWidth: "calc(var(--ck) * 1.05px)" })} />
                                  <path className="crack" d="M131 80 L133 83.9 L135 87.5 L139 92.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r4a} style={css({ strokeWidth: "calc(var(--ck) * 2.0px)" })} />
                                  <path className="crack" d="M139 92.5 L140 99 L143.1 102.3 L145.5 104.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r4b} style={css({ strokeWidth: "calc(var(--ck) * 1.5px)" })} />
                                  <path className="crack" d="M145.5 104.5 L146.5 107.6 L147.5 112 L150.6 115.3 L153 118.5" pathLength="100" strokeDashoffset={v.cv.crackOff_r4c} style={css({ strokeWidth: "calc(var(--ck) * 1.05px)" })} />
                                  <path className="crack" d="M106.5 66.5 L104 72.5 L99 76.5 L93.5 77.5" pathLength="100" strokeDashoffset={v.cv.crackOff_b1} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M133 51 L138.5 46.5 L141 40.5" pathLength="100" strokeDashoffset={v.cv.crackOff_b2} style={css({ strokeWidth: "calc(var(--ck) * 1.05px)" })} />
                                  <path className="crack" d="M145.5 104.5 L142.4 107 L139 109.5 L136.5 116.5" pathLength="100" strokeDashoffset={v.cv.crackOff_b3} style={css({ strokeWidth: "calc(var(--ck) * 1.05px)" })} />
                                  <path className="crack" d="M158 67 L160.3 70.5 L162 73.5 L168 75.5" pathLength="100" strokeDashoffset={v.cv.crackOff_b4} style={css({ strokeWidth: "calc(var(--ck) * 1.0px)" })} />
                                  <path className="crack" d="M133.5 37 L131.2 32.9 L128 27.4 L125.5 22.5 L123.1 18.6 L121 14.4 L118.2 10.4 L116.5 7" pathLength="100" strokeDashoffset={v.cv.crackOff_t1a} style={css({ strokeWidth: "calc(var(--ck) * 1.1px)" })} />
                                  <path className="crack" d="M116.5 7 L112.8 3.2 L110 0.5" pathLength="100" strokeDashoffset={v.cv.crackOff_t1b} style={css({ strokeWidth: "calc(var(--ck) * 0.85px)" })} />
                                  <path className="crack" d="M110.5 106 L106.6 110.4 L103.7 114 L100.1 118.3 L97.5 122 L93.4 125.1 L90.1 127.7 L87.3 130.5 L82.9 134.1 L80 136.5" pathLength="100" strokeDashoffset={v.cv.crackOff_l3a} style={css({ strokeWidth: "calc(var(--ck) * 1.1px)" })} />
                                  <path className="crack" d="M80 136.5 L76.6 139 L72.8 142.4 L68.2 145.9 L64.6 148.6 L61 151 L57.6 154.9 L55 157.5 L52 160.5" pathLength="100" strokeDashoffset={v.cv.crackOff_l3b} style={css({ strokeWidth: "calc(var(--ck) * 0.95px)" })} />
                                  <path className="crack" d="M163 61 L165.3 57 L168 53 L166.8 49.2 L166 44.5 L167.6 40.9 L170 36" pathLength="100" strokeDashoffset={v.cv.crackOff_u1} style={css({ strokeWidth: "calc(var(--ck) * 0.95px)" })} />
                                  <path className="crack" d="M85.5 52 L83.7 47.3 L80.9 41.2 L78.5 36 L80.2 32.1 L81.9 28.1 L84.4 23.1 L86.5 19" pathLength="100" strokeDashoffset={v.cv.crackOff_t2a} style={css({ strokeWidth: "calc(var(--ck) * 1.05px)" })} />
                                  <path className="crack" d="M86.5 19 L88.3 15 L90 10" pathLength="100" strokeDashoffset={v.cv.crackOff_t2b} style={css({ strokeWidth: "calc(var(--ck) * 0.85px)" })} />
                                  <path className="crack" d="M153 118.5 L153.3 123 L153.2 127.5 L153.2 132 L153.5 137 L153.7 142.8 L154.4 147.4 L154.7 151.9 L155 158" pathLength="100" strokeDashoffset={v.cv.crackOff_l4a} style={css({ strokeWidth: "calc(var(--ck) * 1.1px)" })} />
                                  <path className="crack" d="M155 158 L152 162.5 L149.6 164.9 L146.9 168.9 L143.3 173.4 L141 177 L136.8 181.2 L133 185" pathLength="100" strokeDashoffset={v.cv.crackOff_l4b} style={css({ strokeWidth: "calc(var(--ck) * 0.95px)" })} />
                                  <path className="crack" d="M93.5 77.5 L89.4 75.8 L85.3 74.5 L80.6 72.2 L77 71 L73.4 68.8 L69.6 66 L65.2 62.8 L61 60" pathLength="100" strokeDashoffset={v.cv.crackOff_l5a} style={css({ strokeWidth: "calc(var(--ck) * 1.1px)" })} />
                                  <path className="crack" d="M61 60 L57.8 57.9 L52.9 54.5 L49.5 52.7 L45.5 50" pathLength="100" strokeDashoffset={v.cv.crackOff_l5b} style={css({ strokeWidth: "calc(var(--ck) * 0.85px)" })} />
                                  <path className="crack" d="M168 75.5 L170.1 79.7 L172.4 83.4 L174.6 87.7 L177 91.5 L179 95.8 L181.1 100.8 L182.9 105.4 L185 109.5" pathLength="100" strokeDashoffset={v.cv.crackOff_l6a} style={css({ strokeWidth: "calc(var(--ck) * 1.0px)" })} />
                                  <path className="crack" d="M185 109.5 L186.6 113.2 L188 118" pathLength="100" strokeDashoffset={v.cv.crackOff_l6b} style={css({ strokeWidth: "calc(var(--ck) * 0.8px)" })} />
                                  <path className="crack" d="M78.5 36 L75.2 34.6 L71 33 L68.4 29.3 L66 26.5" pathLength="100" strokeDashoffset={v.cv.crackOff_t2b} style={css({ strokeWidth: "calc(var(--ck) * 0.85px)" })} />
                                  <path className="crack" d="M80 136.5 L83.3 137.6 L87 139.5 L93 138" pathLength="100" strokeDashoffset={v.cv.crackOff_s2c} style={css({ strokeWidth: "calc(var(--ck) * 0.95px)" })} />
                                  <path className="crack" d="M80 136.5 L76.3 134.5 L72.1 132.3 L68.4 130.7 L64 128.5" pathLength="100" strokeDashoffset={v.cv.crackOff_s2aa} style={css({ strokeWidth: "calc(var(--ck) * 1.0px)" })} />
                                  <path className="crack" d="M64 128.5 L59.2 126.6 L53.2 124.6 L49.1 122.9 L44 121" pathLength="100" strokeDashoffset={v.cv.crackOff_s2ab} style={css({ strokeWidth: "calc(var(--ck) * 0.8px)" })} />
                                  <path className="crack" d="M141 177 L145.7 179.8 L149 182 L151.8 184.8 L156 188.5" pathLength="100" strokeDashoffset={v.cv.crackOff_s3a} style={css({ strokeWidth: "calc(var(--ck) * 0.9px)" })} />
                                  <path className="crack" d="M80 136.5 L80.5 140.6 L81 145.4 L81.5 150.1 L82 154.5 L84.3 158.3 L87 163.1 L89.3 167.4 L92 172.5" pathLength="100" strokeDashoffset={v.cv.crackOff_s2ba} style={css({ strokeWidth: "calc(var(--ck) * 1.0px)" })} />
                                  <path className="crack" d="M92 172.5 L94.7 176.1 L97.8 180.4 L100.4 183.8 L103.3 188.2 L106 192" pathLength="100" strokeDashoffset={v.cv.crackOff_s2bb} style={css({ strokeWidth: "calc(var(--ck) * 0.85px)" })} />
                                  <path className="crack" d="M141 177 L137.6 172.9 L135 170 L131.6 169.1 L127 167.5 L123.4 163.9 L120 160" pathLength="100" strokeDashoffset={v.cv.crackOff_s3b} style={css({ strokeWidth: "calc(var(--ck) * 0.9px)" })} />
                                  <path className="crack" d="M127 89.3 L123.1 90 L119.3 90.7 L115 91.6 L109.4 93.7 L104.4 92.6 L100.2 92.2 L96 93.4 L92.6 95.3 L87.9 93.2 L82.7 91.8 L78.2 93 L73.7 94.9" pathLength="100" strokeDashoffset={v.cv.crackOff_zla} style={css({ strokeWidth: "calc(var(--ck) * 1.9px)" })} />
                                  <path className="crack" d="M73.7 94.9 L69.8 94.7 L66.2 95 L62.5 94.7 L58.6 94.4 L53.4 94.4 L48.4 94.4 L44.1 92.2 L39.8 90.2 L36.3 90.8 L31.3 91.2" pathLength="100" strokeDashoffset={v.cv.crackOff_zlb} style={css({ strokeWidth: "calc(var(--ck) * 1.75px)" })} />
                                  <path className="crack" d="M135 88.2 L139.2 87.5 L142.7 86.1 L147.7 87 L151.4 88.4 L155.8 87.6 L161.7 87.4" pathLength="100" strokeDashoffset={v.cv.crackOff_zra} style={css({ strokeWidth: "calc(var(--ck) * 1.9px)" })} />
                                  <path className="crack" d="M161.7 87.4 L166.6 87 L170.7 86.9 L174.9 85.4 L178.9 83.4 L183.5 84.2 L187.2 84.3" pathLength="100" strokeDashoffset={v.cv.crackOff_zrb} style={css({ strokeWidth: "calc(var(--ck) * 1.75px)" })} />
                                  <path className="crack" d="M100.2 92.2 L98.7 98.2 L100.7 104.2" pathLength="100" strokeDashoffset={v.cv.crackOff_h1} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M78.2 93 L75.7 87 L77.2 80.5" pathLength="100" strokeDashoffset={v.cv.crackOff_h2} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M58.6 94.4 L56.1 100.9 L52.6 105.4" pathLength="100" strokeDashoffset={v.cv.crackOff_h3} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M161.7 87.4 L164.2 93.9 L162.2 99.9" pathLength="100" strokeDashoffset={v.cv.crackOff_h4} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M170.7 86.9 L172.7 80.4 L170.7 75.4" pathLength="100" strokeDashoffset={v.cv.crackOff_h5} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M44.1 92.2 L45.1 86.2 L48.1 82.2" pathLength="100" strokeDashoffset={v.cv.crackOff_h6} style={css({ strokeWidth: "calc(var(--ck) * 1.15px)" })} />
                                  <path className="crack" d="M113 69 L117.5 63.5 L124.5 61 L128.3 61.9 L132 63" pathLength="100" strokeDashoffset={v.cv.crackOff_fa} style={css({ strokeWidth: "calc(var(--ck) * 1.3px)" })} />
                                  <path className="crack" d="M89 91.9 L94 88.4 L101 89.9 L103.5 94.9 L100 99.9 L96.5 99.9 L92.5 99.4 L90.6 95.1 L89 91.9" pathLength="100" strokeDashoffset={v.cv.crackOff_fb} style={css({ strokeWidth: "calc(var(--ck) * 1.3px)" })} />
                                  <g className="flake" opacity={v.cv.flakeOn_f0}>
                                    <path d="M110.8 99.8 L112.4 96.3 L110.7 95.8 L115.8 92.7 L115.7 90.6 L119.1 91.6 L121 91.1 L120.4 93.8 L121.3 96.2 L116.3 98.2 L113.5 100.8 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M110.8 99.8 L112.4 96.3 M110.7 95.8 L115.8 92.7 M115.8 92.7 L115.7 90.6 M115.7 90.6 L119.1 91.6 M119.1 91.6 L121 91.1" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M175 88.2 L177.8 88.5 L176.4 90.5 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M115.3 96.1 L115.2 98.5 L113.1 99.3 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f1}>
                                    <path d="M141.1 102.1 L140.1 100.5 L139 100.8 L139 99 L138 97.5 L139.5 97.4 L139.7 96.6 L140 97.5 L141.7 98.4 L141.3 99.6 L141.9 101.1 L141 100.7 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M139 100.8 L139 99 M138 97.5 L139.5 97.4 M139.5 97.4 L139.7 96.6 M140 97.5 L141.7 98.4" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M144.6 105.2 L144.7 107 L142.9 106.5 L143 105.3 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M146.9 109.1 L145.5 110.2 L147.1 110.3 L148 109.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f2}>
                                    <path d="M155 68.5 L151.9 70.3 L151.3 71.7 L148.9 71.5 L147.2 71.5 L148 69.8 L147.3 68.1 L151.5 66.7 L153.6 65.3 L152.8 67.2 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M147.2 71.5 L148 69.8 M147.3 68.1 L151.5 66.7 M151.5 66.7 L153.6 65.3 M152.8 67.2 L155 68.5" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M141.6 107.5 L139.6 106.3 L140.1 108.7 L141.6 109.4 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f3}>
                                    <path d="M134.1 50.5 L133.8 50.9 L133.8 52.2 L132.8 52.4 L132.4 53.2 L132.1 52.1 L131.5 51.2 L132.1 49.9 L132 49 L132.6 49.4 L133.8 49.3 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M131.5 51.2 L132.1 49.9 M132.1 49.9 L132 49 M132 49 L132.6 49.4 M132.6 49.4 L133.8 49.3" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M173 84.5 L171.8 86.2 L173.9 86.3 L174.9 84.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M170.3 80.1 L172.2 80.6 L172 82.8 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f4}>
                                    <path d="M172.7 95.1 L172.6 91.3 L171.1 89.3 L173 88.7 L174.9 86.3 L177.4 89.2 L178.1 89.1 L179.4 93.6 L180.6 94.6 L178.7 96.2 L175.6 97.4 L174.4 95.1 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M172.7 95.1 L172.6 91.3 M171.1 89.3 L173 88.7 M173 88.7 L174.9 86.3 M177.4 89.2 L178.1 89.1" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M148.6 72.9 L148.5 70.3 L150.4 70.4 L150.8 72.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M168.3 76.2 L167.6 77.4 L169.3 78.1 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f5}>
                                    <path d="M169.6 54.7 L168.6 54.3 L167.6 55.5 L166.9 54.4 L166.2 53.3 L166.5 52.6 L167.3 50.1 L168.7 50.9 L169.9 51.4 L169.3 52.6 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M166.2 53.3 L166.5 52.6 M166.5 52.6 L167.3 50.1 M167.3 50.1 L168.7 50.9 M168.7 50.9 L169.9 51.4" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M143.4 102.6 L143.4 104.6 L144.9 103.9 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f6}>
                                    <path d="M145 111.1 L146 109.2 L146.4 108.2 L148.3 109.4 L149.8 110.7 L150 112 L150.7 113.5 L149.2 114.9 L148.1 115.5 L147 113.6 L146 113.3 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M145 111.1 L146 109.2 M146 109.2 L146.4 108.2 M146.4 108.2 L148.3 109.4" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M92.6 77.1 L90 78 L89.8 76 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M122.3 17 L120.9 16.9 L121.5 15.4 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f7}>
                                    <path d="M104 112 L104.7 112.7 L104.7 113.6 L104.6 113.9 L104.5 114.6 L103.1 115.1 L102.2 115.7 L102.3 114.8 L101.7 114.9 L102.4 113.7 L103 112 L103.5 112.6 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M102.2 115.7 L102.3 114.8 M101.7 114.9 L102.4 113.7 M102.4 113.7 L103 112 M103.5 112.6 L104 112" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M80.6 141.5 L82.1 143.3 L80.9 144.8 L79.8 142.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f8}>
                                    <path d="M91.2 75.5 L89.6 75.4 L84.9 75.6 L83.4 74.1 L80.3 73.1 L81.4 71.4 L81.6 69.5 L85.4 70.1 L89.8 71.6 L90.2 73.2 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M80.3 73.1 L81.4 71.4 M81.4 71.4 L81.6 69.5 M81.6 69.5 L85.4 70.1 M85.4 70.1 L89.8 71.6" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M151.4 163.1 L151.6 164 L150.3 164.2 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M56.8 57.2 L54.6 57.6 L54.8 55.8 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f9}>
                                    <path d="M157.1 148.7 L155.4 149.4 L154.5 150.9 L153.6 148.8 L153 147.6 L153.3 146.3 L153.3 145.1 L154.1 145.1 L155.1 144.5 L156.1 146.6 L156.7 147.1 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M153 147.6 L153.3 146.3 M153.3 146.3 L153.3 145.1 M153.3 145.1 L154.1 145.1 M154.1 145.1 L155.1 144.5" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M71.1 131.8 L69.3 133.3 L69.4 131.1 L70.8 129.8 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M163.9 59.5 L165.3 59.8 L164.5 58.4 L163.2 58.5 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f10}>
                                    <path d="M83.9 21.7 L84.5 22.1 L85.8 21.3 L86.4 21.9 L87.1 22.7 L86.4 23.5 L85.9 25.2 L85.6 24.8 L84.5 25.5 L83.7 25 L83.3 24.7 L83.5 23.4 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M83.9 21.7 L84.5 22.1 M84.5 22.1 L85.8 21.3 M83.3 24.7 L83.5 23.4 M83.5 23.4 L83.9 21.7" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M82.7 26.5 L82.3 25.1 L84.1 23.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f11}>
                                    <path d="M147.3 167.8 L147.3 166.6 L147.1 164.7 L148.5 163.2 L149.3 161.6 L151.4 161.8 L153.1 162.1 L151.7 165.6 L150.6 167.2 L149.8 167.1 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M147.3 167.8 L147.3 166.6 M147.3 166.6 L147.1 164.7 M147.1 164.7 L148.5 163.2 M148.5 163.2 L149.3 161.6 M149.3 161.6 L151.4 161.8 M151.4 161.8 L153.1 162.1" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M111.9 2.4 L110.4 3 L110.5 1 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M152.5 185.4 L153.5 187.5 L155.5 188 L154.1 185.5 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f12}>
                                    <path d="M50 124.6 L50.9 124.2 L51.2 122.6 L52.5 123.5 L54.9 123.8 L55.4 124.8 L55.6 125.6 L54.7 126 L53.7 126.3 L52.3 125.7 L51.6 125.7 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M50 124.6 L50.9 124.2 M50.9 124.2 L51.2 122.6 M51.2 122.6 L52.5 123.5 M52.5 123.5 L54.9 123.8" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M148.5 166.5 L149.7 167.8 L147.9 167.5 L147.2 166.1 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f13}>
                                    <path d="M128.3 29.4 L127.6 28 L126.8 27.5 L127.3 26.5 L126.6 25.5 L127.9 25.9 L128.3 25.2 L128.9 25.9 L129.5 26.4 L129.7 27.4 L129.4 28.9 L129.3 28.7 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M126.8 27.5 L127.3 26.5 M126.6 25.5 L127.9 25.9 M127.9 25.9 L128.3 25.2" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M84.6 74.2 L83.7 72.7 L82 72.9 L82.7 74 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M96.5 122.8 L96.6 125 L94.7 124.2 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f14}>
                                    <path d="M146 177.3 L148.8 177.9 L151.6 178.9 L152.6 180.9 L154.2 182.8 L152.8 183.6 L149.7 184.3 L149 183 L147 181.3 L147.2 180 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M146 177.3 L148.8 177.9 M148.8 177.9 L151.6 178.9 M147 181.3 L147.2 180" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M80.2 39.7 L78 38.8 L79.1 37.3 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M90.3 169.3 L89.8 171.9 L91.7 171.9 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f15}>
                                    <path d="M69.9 147.1 L68.1 147.6 L67.1 147.9 L66.9 147.3 L66.1 146.6 L66.9 146.1 L67.5 144.6 L68.5 144.9 L70 144.6 L70 145.3 L70.4 145.7 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M66.1 146.6 L66.9 146.1 M66.9 146.1 L67.5 144.6 M67.5 144.6 L68.5 144.9 M68.5 144.9 L70 144.6" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M120.1 13.1 L118.2 12.9 L119 11.5 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f16}>
                                    <path d="M72.4 133.9 L72.3 132.7 L69.8 132.1 L70.3 131.5 L69.7 129.9 L71.4 129.8 L72.6 129.3 L72.8 130 L75.1 131 L74.6 131.5 L75.7 132.3 L74.3 132.8 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M72.4 133.9 L72.3 132.7 M69.8 132.1 L70.3 131.5 M69.7 129.9 L71.4 129.8 M71.4 129.8 L72.6 129.3 M72.8 130 L75.1 131" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M98.6 181.4 L100.4 181 L99.5 182.7 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                    <path d="M88.8 13.4 L87 11.9 L89.4 11.8 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                  <g className="flake" opacity={v.cv.flakeOn_f17}>
                                    <path d="M90.7 171.1 L91.4 171.1 L91.6 170.6 L92.5 171.4 L93.6 172.5 L93.2 172.7 L93.5 173.9 L92.6 173.5 L91.4 173.6 L91.3 172.6 Z" fill="#ede2d2" stroke={v.crackInk} strokeWidth="0.8" />
                                    <path d="M90.7 171.1 L91.4 171.1 M91.4 171.1 L91.6 170.6 M91.4 173.6 L91.3 172.6" stroke="#a88c76" strokeWidth="1.2" strokeOpacity="0.5" />
                                    <path d="M80.2 137.7 L81.4 138.4 L80.4 139.5 Z" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.6" />
                                  </g>
                                </g>
                                <g className="crack-chips" fill="#efe4d4" stroke={v.crackInk} strokeWidth="0.7" strokeLinejoin="round">
                                  <path className="crack-chip" d="M131.1 82.2 L128.4 81.7 L130.3 79.3 L132.7 78.6 L134.9 80.3 Z" opacity={v.cv.chipOn_p0} />
                                  <path className="crack-chip" d="M127.4 78.5 L125.2 77.4 L128.2 75.3 L128.9 77.6 Z" opacity={v.cv.chipOn_p1} />
                                  <path className="crack-chip" d="M133.6 84.7 L133.3 82.6 L136.8 81.8 L137.6 84.1 Z" opacity={v.cv.chipOn_p2} />
                                  <path className="crack-chip" d="M79.8 138.6 L78.5 136.2 L80.1 134.7 L81.1 137 Z" opacity={v.cv.chipOn_d2} />
                                  <path className="crack-chip" d="M139.4 178.4 L138.8 176.7 L141.5 176.1 L142.8 177.4 Z" opacity={v.cv.chipOn_d3} />
                                  <path className="crack-chip" d="M116.2 93.5 L112.9 93 L113.5 90.5 L117.6 90.7 Z" opacity={v.cv.chipOn_zl0} />
                                  <path className="crack-chip" d="M106.2 94.7 L103.1 94.5 L101.8 91.3 L106.2 91.3 L106.7 92.3 Z" opacity={v.cv.chipOn_zl1} />
                                  <path className="crack-chip" d="M87.9 96.3 L83.9 93 L88.1 91.7 L92.3 93.1 Z" opacity={v.cv.chipOn_zl2} />
                                  <path className="crack-chip" d="M72.1 96.8 L71.4 95.8 L73.4 93.5 L76 94.3 L76.2 96.8 Z" opacity={v.cv.chipOn_zl3} />
                                  <path className="crack-chip" d="M63.8 93.3 L63.8 97.8 L60.9 96.3 L61 93.1 Z" opacity={v.cv.chipOn_zl4} />
                                  <path className="crack-chip" d="M51.1 94.1 L50.8 96.7 L46.6 97.1 L46.7 93.6 L48.9 92.9 Z" opacity={v.cv.chipOn_zl5} />
                                  <path className="crack-chip" d="M38.2 91.9 L35.7 92.6 L33.4 91 L35.8 89 Z" opacity={v.cv.chipOn_zl6} />
                                  <path className="crack-chip" d="M147.1 86.1 L149.2 86.9 L147.5 89.6 L144.8 87.5 Z" opacity={v.cv.chipOn_zr0} />
                                  <path className="crack-chip" d="M156.4 86.2 L158.7 89.2 L154 90.8 L153.4 86.6 Z" opacity={v.cv.chipOn_zr1} />
                                  <path className="crack-chip" d="M164 85.8 L168.1 85.3 L167.7 88.4 L166 89.5 Z" opacity={v.cv.chipOn_zr2} />
                                  <path className="crack-chip" d="M177.9 80.5 L181.5 83.2 L179.7 85.8 L177.1 85 Z" opacity={v.cv.chipOn_zr3} />
                                </g>
                                <g className="crack-major" fill="none" stroke="#8f6c56" strokeLinecap="round" strokeLinejoin="round">
                                  <path d="M31.3 91.2 L36.3 90.8 L39.8 90.2 L44.1 92.2 L48.4 94.4 L53.4 94.4 L58.6 94.4 L62.5 94.7 L66.2 95 L69.8 94.7 L73.7 94.9 L78.2 93 L82.7 91.8 L87.9 93.2 L92.6 95.3 L96 93.4 L100.2 92.2 L104.4 92.6 L109.4 93.7 L115 91.6 L119.3 90.7 L123.1 90 L127 89.3 L131 85.5 L135 88.2 L139.2 87.5 L142.7 86.1 L147.7 87 L151.4 88.4 L155.8 87.6 L161.7 87.4 L166.6 87 L170.7 86.9 L174.9 85.4 L178.9 83.4 L183.5 84.2 L187.2 84.3" pathLength="100" strokeWidth="2.8" />
                                  <path className="crack-split" d="M109.4 93.7 L108.6 98 L108 104 L109.5 108.6 L111.3 113.7 L113 117.5 L111.1 121.3 L108.9 127.2 L107.5 131 L109 136.4 L110.8 140.1 L112.5 146 L110.3 151.1 L109 155.8 L107 161 L108.7 166 L110.3 170.3 L112 176 L110.3 182 L109.5 186.7 L108.5 192 L109 197.5 L109.1 201.2 L109.8 206 L110 211" pathLength="100" strokeWidth="2.4" />
                                </g>
                              </g>
                              <g className="frag frag-a" style={css({ "--lift": v.frag_a })}>
                                <path className="frag-gap" d="M113 69 L117.5 63.5 L124.5 61 L132 63 L131.5 67.5 L125.5 67 L120 70.5 L117.5 74 Z" fill="#a07a62" />
                                <path className="frag-piece" d="M113 69 L117.5 63.5 L124.5 61 L132 63 L131.5 67.5 L125.5 67 L120 70.5 L117.5 74 Z" fill="#fffaf1" stroke="#8f6c56" strokeWidth="1.4" strokeLinejoin="round" />
                              </g>
                              <g className="frag frag-b" style={css({ "--lift": v.frag_b })}>
                                <path className="frag-gap" d="M89 91.9 L94 88.4 L101 89.9 L103.5 94.9 L100 99.9 L92.5 99.4 Z" fill="#a07a62" />
                                <path className="frag-piece" d="M89 91.9 L94 88.4 L101 89.9 L103.5 94.9 L100 99.9 L92.5 99.4 Z" fill="#fffaf1" stroke="#8f6c56" strokeWidth="1.4" strokeLinejoin="round" />
                              </g>
                              <g className="lift" opacity={v.cv.liftOn_u0} style={css({ "--lift": v.cv.liftOn_u0 })}>
                                <path d="M153.6 137.3 L156.3 140.2 L157.6 142.9 L155.6 144 L153.6 144.8 L151.1 143.5 L148.7 141.3 L149.7 138.9 L152.8 137.1 Z" fill="#a07a62" />
                                <path className="lift-piece" d="M153.6 137.3 L156.3 140.2 L157.6 142.9 L155.6 144 L153.6 144.8 L151.1 143.5 L148.7 141.3 L149.7 138.9 L152.8 137.1 Z" fill="#fffaf1" stroke="#8f6c56" strokeWidth="1.2" strokeLinejoin="round" style={css({ transformOrigin: "15% 85%", transform: "translate(calc(var(--lift) * -1.2px), calc(var(--lift) * -2.6px)) rotate(calc(var(--lift) * -22deg))", animationDelay: "-0.0s" })} />
                              </g>
                              <g className="lift" opacity={v.cv.liftOn_u1} style={css({ "--lift": v.cv.liftOn_u1 })}>
                                <path d="M67.6 118.4 L65.5 120.1 L62 121.3 L61.9 119.9 L60.5 116 L62.1 114.7 L65 111.5 L65.7 114.4 L67.2 114.6 Z" fill="#a07a62" />
                                <path className="lift-piece" d="M67.6 118.4 L65.5 120.1 L62 121.3 L61.9 119.9 L60.5 116 L62.1 114.7 L65 111.5 L65.7 114.4 L67.2 114.6 Z" fill="#fffaf1" stroke="#8f6c56" strokeWidth="1.2" strokeLinejoin="round" style={css({ transformOrigin: "88% 80%", transform: "translate(calc(var(--lift) * 1.2px), calc(var(--lift) * -2.4px)) rotate(calc(var(--lift) * 21deg))", animationDelay: "-0.5s" })} />
                              </g>
                              <g className="lift" opacity={v.cv.liftOn_u2} style={css({ "--lift": v.cv.liftOn_u2 })}>
                                <path d="M98.1 166.5 L96.1 163.9 L94.7 162.8 L98.6 160.3 L102.7 159.1 L103.3 160.6 L105.6 162.8 L102.5 165.1 L101.9 166.4 Z" fill="#a07a62" />
                                <path className="lift-piece" d="M98.1 166.5 L96.1 163.9 L94.7 162.8 L98.6 160.3 L102.7 159.1 L103.3 160.6 L105.6 162.8 L102.5 165.1 L101.9 166.4 Z" fill="#fffaf1" stroke="#8f6c56" strokeWidth="1.2" strokeLinejoin="round" style={css({ transformOrigin: "85% 85%", transform: "translate(calc(var(--lift) * 0.9px), calc(var(--lift) * -2.6px)) rotate(calc(var(--lift) * 20deg))", animationDelay: "-1.0s" })} />
                              </g>
                              <path d="M-13.5 -5 L-10 -10.5 L-6.5 -9.5 L-3.5 -14.5 L2 -13 L4.5 -15 L9 -11.5 L14 -7 L13 -2.5 L16.5 2 L13.5 6.5 L11 12.5 L6 11 L2.5 14.5 L-2 12 L-7.5 13.5 L-10 8.5 L-15.5 4 L-14 0.5 Z" fill="none" stroke="#5a3a28" strokeWidth="2.5" strokeLinejoin="round" vectorEffect="non-scaling-stroke" style={css({ transformBox: "view-box", transformOrigin: "0 0", transform: `translate(131px, 80px) scale(${v.holeScale})`, transition: "transform .8s ease" })} />
                            </g>
                            <g className="chip chip-l">
                              <path d="M114 70 L124 64 L126 76 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2" strokeLinejoin="round" />
                            </g>
                            <g className="chip chip-r">
                              <path d="M144 66 L156 62 L152 74 Z" fill="#fffaf1" stroke="#5a3a28" strokeWidth="2" strokeLinejoin="round" />
                            </g>
                            <g className="chip chip-l">
                              <path d="M122 92 L130 86 L134 96 Z" fill="#cfe6d8" stroke="#5a3a28" strokeWidth="2" strokeLinejoin="round" />
                            </g>
                          </g>
                          <g className="dg-excl">
                            <rect x="168" y="2" width="9" height="22" rx="4.5" fill="#f15b48" stroke="#5a3a28" strokeWidth="2" />
                            <circle cx="172.5" cy="32" r="4.5" fill="#f15b48" stroke="#5a3a28" strokeWidth="2" />
                          </g>
                          <g className="dg-thought">
                            <circle cx="156" cy="16" r="4" fill="#ffffff" stroke="#5a3a28" strokeWidth="2" />
                            <circle cx="167" cy="2" r="6" fill="#ffffff" stroke="#5a3a28" strokeWidth="2" />
                            <path d="M169.8 -19.4 C 167.7 -34.6 187.1 -41 193.6 -30.2 C 202.2 -41 219.5 -32.4 215.2 -19.4 C 226 -13 217.4 2.2 206.6 -2.2 C 200.1 6.5 180.6 6.5 178.5 -2.2 C 165.5 0 161.2 -13 169.8 -19.4 Z" fill="#ffffff" stroke="#5a3a28" strokeWidth="2" />
                            <svg x={v.thoughtX} y={v.thoughtY} width={v.thoughtSize} height={v.thoughtSize} viewBox="0 0 80 80" overflow="visible">
                              <use href={`#jvArt-${v.thoughtKey}-back`} />
                              <use href={`#jvArt-${v.thoughtKey}-full`} />
                              <use href={`#jvArt-${v.thoughtKey}-front`} />
                            </svg>
                          </g>
                        </g>
                      </g>
                    </g>
                    <circle className="burst burst-flash" cx="110" cy="96" r="84" fill="#ffffff" />
                    <g className="burst burst-cap">
                      <g clipPath="url(#jvCapClip)">
                        <use href="#jvEggShell" />
                        <use href="#jvEggCracks" />
                      </g>
                      <path d="M31.3 91.2 L36.3 90.8 L39.8 90.2 L44.1 92.2 L48.4 94.4 L53.4 94.4 L58.6 94.4 L62.5 94.7 L66.2 95 L69.8 94.7 L73.7 94.9 L78.2 93 L82.7 91.8 L87.9 93.2 L92.6 95.3 L96 93.4 L100.2 92.2 L104.4 92.6 L109.4 93.7 L115 91.6 L119.3 90.7 L123.1 90 L127 89.3 L131 85.5 L135 88.2 L139.2 87.5 L142.7 86.1 L147.7 87 L151.4 88.4 L155.8 87.6 L161.7 87.4 L166.6 87 L170.7 86.9 L174.9 85.4 L178.9 83.4 L183.5 84.2 L187.2 84.3" fill="none" stroke="#5a3a28" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "-78px", "--sy": "-40px", animationDelay: "0ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f2c35b" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "-60px", "--sy": "-92px", animationDelay: "40ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f15b48" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "-14px", "--sy": "-118px", animationDelay: "80ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#7fb89a" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "40px", "--sy": "-104px", animationDelay: "120ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f2c35b" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "82px", "--sy": "-60px", animationDelay: "160ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f15b48" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "90px", "--sy": "6px", animationDelay: "200ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#7fb89a" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "-92px", "--sy": "14px", animationDelay: "240ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f9cfb4" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                    <g className="burst burst-spark" style={css({ "--sx": "6px", "--sy": "-70px", animationDelay: "280ms" })}>
                      <path d="M0 -7 L1.8 -1.8 L7 0 L1.8 1.8 L0 7 L-1.8 1.8 L-7 0 L-1.8 -1.8 Z" transform="translate(110 110)" fill="#f9cfb4" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                    </g>
                  </svg>
                </div>
                {v.feedOn ? (
                  <>
                    <span className={v.feedClass} aria-hidden="true" style={css({ top: `${v.feedTop}px`, "--fx": `${v.feedDx}px`, "--fy": `${v.feedDy}px` })}>
                      <span className="feed-x">
                        <span className="feed-y">
                          <svg viewBox="0 0 80 80" width="44" height="44">
                            <use href={`#jvArt-${v.feedKey}-back`} />
                            <use href={`#jvArt-${v.feedKey}-full`} />
                            <use href={`#jvArt-${v.feedKey}-front`} />
                          </svg>
                        </span>
                      </span>
                    </span>
                  </>
                ) : null}
              </button>
            </div>
            <div style={css({ position: "relative", width: "100%", maxWidth: "380px", display: "flex", flexDirection: "column", gap: "10px", background: "#ffffff", border: "2px solid #f3dcc8", borderRadius: "24px", padding: "14px 18px", boxShadow: "0 4px 0 rgba(74, 47, 34, 0.06)" })}>
              {v.hasXpChip ? (
                <>
                  <span className={v.xpChipClass} aria-hidden="true">{v.xpChipText}</span>
                </>
              ) : null}
              <span className={v.hatchCueClass} aria-live="polite">
                <svg viewBox="0 0 20 20" width="16" height="16" aria-hidden="true">
                  <path d="M10 0 L12 8 L20 10 L12 12 L10 20 L8 12 L0 10 L8 8 Z" fill="#f2c35b" stroke="#5a3a28" strokeWidth="1.4" strokeLinejoin="round" />
                </svg>
                {v.hatchCueText}
              </span>
              <div style={css({ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: "8px" })}>
                <div style={css({ display: "flex", alignItems: "baseline", gap: "8px" })}>
                  <span lang="vi" style={css({ fontFamily: "var(--font-heading), sans-serif", fontSize: "22px", lineHeight: "28px", fontWeight: "800", color: "#4a2f22" })}>
                    Rồng Con
                  </span>
                  <span style={css({ fontSize: "13px", lineHeight: "18px", fontWeight: "800", color: "#2f6b55" })}>{v.stageLabel}</span>
                </div>
                <div style={css({ display: "flex", gap: "4px" })} aria-label={v.heartsLabel} role="img">
                  {v.hearts.map((h, hi) => (
                    <Fragment key={hi}>
                      <svg viewBox="0 0 20 18" width="22" height="20" aria-hidden="true">
                        <path d="M10 17 C 4 12 1 9 1 6 C 1 3 3 1 6 1 C 8 1 9.5 2.2 10 3.5 C 10.5 2.2 12 1 14 1 C 17 1 19 3 19 6 C 19 9 16 12 10 17 Z" fill={h.fill} stroke="#f15b48" strokeWidth="2" strokeLinejoin="round" />
                      </svg>
                    </Fragment>
                  ))}
                </div>
              </div>
              <span style={css({ fontSize: "14px", lineHeight: "20px", fontWeight: "700", color: "#6b4a38" })}>{v.moodText}</span>
              <div style={css({ display: "flex", flexDirection: "column", gap: "6px" })}>
                <div style={css({ display: "flex", justifyContent: "space-between", gap: "8px", fontSize: "13px", lineHeight: "18px", fontWeight: "800" })}>
                  <span style={css({ color: "#4a2f22" })}>{v.xpText}</span>
                  <span style={css({ color: "#6b4a38" })}>{v.nextText}</span>
                </div>
                <div role="progressbar" aria-label="Experience toward next growth stage" aria-valuemin={0} aria-valuemax={100} aria-valuenow={v.xpPctNum} style={css({ height: "12px", borderRadius: "9999px", background: "#f3e3d3", overflow: "hidden" })}>
                  <div style={css({ height: "100%", borderRadius: "9999px", background: "#4f9a78", width: v.xpPct, transition: "width .6s ease" })} />
                </div>
              </div>
            </div>
          </div>
        </section>
        <section aria-labelledby="explore-title" style={css({ display: "flex", flexDirection: "column", gap: "16px" })}>
          <h2 id="explore-title" lang="vi" style={css({ margin: "0", fontFamily: "var(--font-heading), sans-serif", fontSize: "24px", lineHeight: "30px", fontWeight: "800", color: "#4a2f22" })}>
            Let’s học!
          </h2>
          <div style={css({ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(300px, 100%), 1fr))", gap: "16px" })}>
            {v.nav.map((n, ni) => (
              <Fragment key={ni}>
                <Link href={n.href} className="nav-card" style={css({ display: "flex", alignItems: "center", gap: "16px", padding: "18px 20px", borderRadius: "24px", textDecoration: "none", color: "#4a2f22", minHeight: "88px" })}>
                  <span style={css({ width: "52px", height: "52px", flexShrink: "0", borderRadius: "9999px", background: n.tint, display: "flex", alignItems: "center", justifyContent: "center" })}>
                    <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
                      <path d={n.icon} fill="none" stroke={n.ink} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span style={css({ minWidth: "0", display: "flex", flexDirection: "column", gap: "2px" })}>
                    <span style={css({ fontFamily: "var(--font-heading), sans-serif", fontSize: "20px", lineHeight: "26px", fontWeight: "800", color: "#4a2f22" })}>
                      {n.label}
                    </span>
                    <span style={css({ fontSize: "14px", lineHeight: "20px", fontWeight: "600", color: "#6b4a38" })}>{n.description}</span>
                  </span>
                </Link>
              </Fragment>
            ))}
          </div>
        </section>
      </main>
      <div className="sr-only" aria-live="polite">{v.guideAnnounce}</div>
      {v.guideOn ? (
        <>
          <div className={v.guideLayerClass}>
            <div className="guide-card" role="dialog" aria-modal={v.guideModal} aria-label={v.guideLabel} aria-describedby={v.guideTextId} tabIndex={-1} ref={guide}>
              {v.guideHasSkip ? (
                <>
                  <button type="button" className="guide-skip" onClick={v.guideSkip}>{v.guideSkipText}</button>
                </>
              ) : null}
              <div className="guide-body">
                <div className={v.guidePortraitClass} style={css({ "--tint": v.guideTint })} aria-hidden="true">
                  <svg className="guide-figure" viewBox="5 8 150 206" width="150" height="206">
                    <use href={`#jvT-${v.guideWho}-back`} />
                    <use href={`#jvT-${v.guideWho}-body`} />
                    <use href={`#jvT-${v.guideWho}-face-${v.guideExpr}`} />
                    <use href={`#jvT-${v.guideWho}-arms-${v.guideExpr}`} />
                  </svg>
                </div>
                <div className="guide-main">
                  <div className="guide-head">
                    <span className={v.guideAvatarClass} style={css({ "--tint": v.guideTint })} aria-hidden="true">
                      <svg viewBox="30 8 100 100" width="52" height="52">
                        <use href={`#jvT-${v.guideWho}-back`} />
                        <use href={`#jvT-${v.guideWho}-body`} />
                        <use href={`#jvT-${v.guideWho}-face-${v.guideExpr}`} />
                        <use href={`#jvT-${v.guideWho}-arms-${v.guideExpr}`} />
                      </svg>
                    </span>
                    <span className="guide-who">
                      <span className="guide-name" lang="vi">{v.guideName}</span>
                      <span className="guide-role" style={css({ color: v.guideInk })}>{v.guideRole}</span>
                    </span>
                  </div>
                  <div className="guide-steps">
                    {v.guideSteps.map((g, gi) => (
                      <Fragment key={gi}>
                        <div className={g.cls} aria-hidden={g.hiddenAttr}>
                          <div style={css({ flex: "1", minWidth: "0" })}>
                            <p className="guide-text" id={g.textId}>
                              {g.hasLead ? (
                                <>
                                  <span className="guide-lead" lang="vi">{g.lead}</span>
                                  {" "}
                                </>
                              ) : null}
                              {g.text}
                            </p>
                            {g.hasChips ? (
                              <>
                                <span className="guide-chips">
                                  {g.chips.map((ch, chi) => (
                                    <Fragment key={chi}>
                                      <span className="guide-chip">
                                        <span className="guide-chip-icon" style={css({ background: ch.tint })}>
                                          <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                                            <path d={ch.icon} fill="none" stroke={ch.ink} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                                          </svg>
                                        </span>
                                        {ch.label}
                                      </span>
                                    </Fragment>
                                  ))}
                                </span>
                              </>
                            ) : null}
                          </div>
                          {g.hasCompanion ? (
                            <>
                              <span className={g.companionCls} aria-hidden="true">
                                <svg viewBox="4 -30 212 252" width="80" height="95"><use href="#jvDragonArt" /></svg>
                                <span className="guide-companion-name" lang="vi">Rồng Con</span>
                                <span className="guide-companion-stage">{g.companionStage}</span>
                              </span>
                            </>
                          ) : null}
                        </div>
                      </Fragment>
                    ))}
                  </div>
                </div>
              </div>
              <div className="guide-foot">
                <span className="guide-dots" aria-hidden="true">
                  {v.guideDots.map((d, di) => (
                    <Fragment key={di}>
                      <span className={d.cls} />
                    </Fragment>
                  ))}
                </span>
                <span className="guide-nav">
                  {v.guideHasBack ? (
                    <>
                      <button type="button" className="guide-btn guide-back" onClick={v.guideBack}>Back</button>
                    </>
                  ) : null}
                  {v.guideHasNext ? (
                    <>
                      <button type="button" className="guide-btn guide-primary guide-go" onClick={v.guideNext}>{v.guideNextText}</button>
                    </>
                  ) : null}
                  {v.guideHasCta ? (
                    <>
                      <Link href="/goals" className="guide-btn guide-primary guide-go" onClick={v.guideCta}>{v.guideCtaText}</Link>
                    </>
                  ) : null}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
