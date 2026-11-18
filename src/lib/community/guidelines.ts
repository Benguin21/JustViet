/**
 * The community guidelines: shown before a member's first contribution
 * (acceptance is saved on their profile), linked from the Community page,
 * and published at /guidelines, which the Terms of Service link to.
 */

export const GUIDELINES = [
  { title: "Be respectful", body: "No harassment, hate or threats. Disagree with ideas, not people." },
  { title: "No spam", body: "No spam, scams or repeated promotion." },
  { title: "Keep personal information private", body: "Don't share private personal information, yours or anyone else's." },
  { title: "Keep it appropriate", body: "Keep it appropriate for a language-learning community of all ages 13 and up." },
  { title: "Correct kindly", body: "Explain corrections constructively, so everyone learns from them." },
  { title: "Respect every way of speaking", body: "Respect regional Vietnamese usage and accents: Northern, Central and Southern Vietnamese are all correct." },
] as const;

export const GUIDELINES_PATH = "/guidelines";
