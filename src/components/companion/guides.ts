/**
 * Teachers and guides: copy and characters only, no goal or XP rules in here.
 *
 * Cô Tươi welcomes and encourages; Thầy Vinh explains how things work. Rồng Con stays the
 * learner's companion. Each teacher is drawn once in the page's sprite (jvT-{who}-back, -body,
 * -face-{expr}, -arms-{expr}) with four expressions: neutral, welcome, explain, encourage.
 */
export type TeacherId = "tuoi" | "vinh";
export type Expression = "neutral" | "welcome" | "explain" | "encourage";

export const TEACHERS: Record<TeacherId, { name: string; role: string; tint: string; ink: string }> = {
  tuoi: { name: "Cô Tươi", role: "Your Vietnamese teacher", tint: "#fdf0cf", ink: "#8a5a12" },
  vinh: { name: "Thầy Vinh", role: "Your study guide", tint: "#e6f2ea", ink: "#2f6b55" },
};

/** The learning sections, as Home's "Let’s học!" cards and the intro's chips show them. */
export const NAV = [
  { href: "/goals", label: "Goals", description: "Set and track your learning targets", tint: "#ffe0da", ink: "#b53722", icon: "M12 3a9 9 0 1 0 0 18a9 9 0 1 0 0-18 M12 7.5a4.5 4.5 0 1 0 0 9a4.5 4.5 0 1 0 0-9 M12 11.2a0.8 0.8 0 1 0 0 1.6a0.8 0.8 0 1 0 0-1.6" },
  { href: "/grammar", label: "Grammar", description: "Learn how Vietnamese sentences work", tint: "#e6f2ea", ink: "#2f6b55", icon: "M3 5.5C5.5 4.5 9 4.5 12 6.5c3-2 6.5-2 9-1v13c-2.5-1-6-1-9 1c-3-2-6.5-2-9-1z M12 6.5v13" },
  { href: "/dictionary", label: "Dictionary", description: "Look up words and their meanings", tint: "#fdf0cf", ink: "#8a5a12", icon: "M10.5 4a6.5 6.5 0 1 0 0 13a6.5 6.5 0 1 0 0-13 M15.5 15.5L20 20" },
  { href: "/vocab-srs", label: "Vocab SRS", description: "Review words with spaced repetition", tint: "#ffe0da", ink: "#b53722", icon: "M8 3h10a2 2 0 0 1 2 2v10 M6 7h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2z M8.5 14h5" },
  { href: "/skills", label: "Skills", description: "Practice reading, listening, and speaking", tint: "#e6f2ea", ink: "#2f6b55", icon: "M12 3.5l2.6 5.3l5.8.8l-4.2 4.1l1 5.8L12 16.8l-5.2 2.7l1-5.8l-4.2-4.1l5.8-.8z" },
  { href: "/community", label: "Community", description: "Connect with other learners", tint: "#fdf0cf", ink: "#8a5a12", icon: "M4 5h11a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2H9l-4 3v-3H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z M19 9h1a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-1v2.5L16 18h-3" },
] as const;

export interface GuideStep {
  who: TeacherId;
  expr: Expression;
  lead?: string;
  text: string;
  /** Learning sections to show as chips, by NAV href. */
  chips?: readonly string[];
  /** Show Rồng Con as it is right now. */
  companion?: boolean;
  /** End with a link to Goals, with this label. */
  cta?: string;
}

export interface Guide {
  label: string;
  /** A modal guide holds the page until it is done or skipped; the others sit on top. */
  modal: boolean;
  done?: string;
  steps: readonly GuideStep[];
}

export type GuideSet = "intro" | "hatch";

export const GUIDES: Record<GuideSet, Guide> = {
  intro: {
    label: "Welcome to JustViet",
    modal: true,
    steps: [
      { who: "tuoi", expr: "welcome", lead: "Xin chào!", text: "Welcome to JustViet! I’m Cô Tươi, your Vietnamese teacher. We’re so happy you’re here! Let’s learn Vietnamese together!" },
      { who: "vinh", expr: "welcome", lead: "Xin chào!", text: "I’m Thầy Vinh. Here, you can practice vocabulary, grammar, and language skills at your own pace. You can explore our lessons anytime!", chips: ["/vocab-srs", "/grammar", "/skills"] },
      { who: "tuoi", expr: "explain", text: "And here’s Rồng Con, your little learning companion! Complete your daily learning goals, then return Home to feed Rồng Con and help your companion grow!", companion: true },
      { who: "vinh", expr: "encourage", text: "First, let’s choose your daily learning goals. Once you’ve finished studying, come back Home to check off your completed goals and feed Rồng Con!", cta: "Set Up My Goals" },
    ],
  },
  hatch: {
    label: "Rồng Con hatched",
    modal: false,
    done: "Yay!",
    steps: [
      { who: "tuoi", expr: "encourage", lead: "Chúc mừng!", text: "Rồng Con just hatched into a Baby Dragon, all thanks to your studying! Thầy Vinh and I are so proud of you." },
    ],
  },
};

/** What a screen reader hears when a step comes up. */
export function guideSays(st: GuideStep): string {
  return TEACHERS[st.who].name + ": " + (st.lead ? st.lead + " " : "") + st.text;
}
