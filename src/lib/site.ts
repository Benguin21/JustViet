/**
 * Facts about JustViet the business, in one place, used by the public
 * site (landing page, privacy policy, terms) and metadata. Update these
 * here rather than in the pages.
 *
 * Before launch:
 *  - `operator` must match the LLC's registered name once it's formed.
 *  - The site address defaults to https://learnjustviet.com (the sitemap,
 *    robots.txt and social previews point at it).
 *  - Have the privacy policy and terms reviewed, then update the dates.
 */

export const SITE = {
  name: "JustViet",
  /** Who runs JustViet — the party in the Terms and the controller in the Privacy Policy. */
  operator: "JustViet LLC",
  /** Where the operator is based; the Terms' governing law. */
  jurisdiction: "the State of Utah, USA",
  governingLawState: "Utah",
  contactEmail: "LearnJustViet@gmail.com",
  /**
   * The public site address, without a trailing slash. Override with
   * NEXT_PUBLIC_SITE_URL (e.g. to preview on another host).
   */
  url: (process.env.NEXT_PUBLIC_SITE_URL || "https://learnjustviet.com").replace(/\/+$/, ""),
  domain: "learnjustviet.com",
  tagline: "Learn Vietnamese a little every day — and actually remember it.",
  description:
    "JustViet is a friendly way to learn Vietnamese: spaced-repetition flashcards, a tone-aware dictionary, daily goals, and Rồng Con, a baby dragon who grows as you study.",
  privacyUpdated: "November 17, 2026",
  termsUpdated: "November 17, 2026",
} as const;

/** The year for copyright lines (computed once, outside render). */
export const COPYRIGHT_YEAR = new Date().getFullYear();
