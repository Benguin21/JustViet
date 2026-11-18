import type { Metadata } from "next";
import Link from "next/link";
import { HeroCtas } from "@/components/marketing/AuthAwareCtas";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "JustViet — Learn Vietnamese a little every day" },
  description: SITE.description,
  alternates: { canonical: "/" },
};

/*
 * Copy rule for this page: describe only what JustViet does today, and
 * label anything planned as "Coming soon". Pricing says it's free during
 * early access, with a monthly plan + free trial planned — update the
 * Pricing section and the Terms together when that launches.
 */

const FEATURES = [
  {
    icon: "🧠",
    title: "Flashcards that time themselves",
    body: "Spaced repetition shows each word right before you'd forget it. Reviews are scheduled by FSRS, a modern memory algorithm, and you can add your own cards or paste in a word list from a spreadsheet.",
    tone: "red",
  },
  {
    icon: "🔎",
    title: "A dictionary built for Vietnamese",
    body: "950 everyday words with meanings, Vietnamese definitions and example sentences. Search with or without accents — “hoc” finds “học” — while words that differ only by tone always stay separate.",
    tone: "yellow",
  },
  {
    icon: "🐉",
    title: "Rồng Con, your study buddy",
    body: "Meet your daily goals to earn XP and feed Rồng Con. Its egg cracks as you level up, then hatches into a baby dragon that keeps growing with you.",
    tone: "red",
  },
  {
    icon: "🎯",
    title: "Goals that fit your day",
    body: "Choose how much to do each day, from a quick five-card warm-up to a longer session. Small, steady habits beat cramming.",
    tone: "yellow",
  },
  {
    icon: "💬",
    title: "A community to ask and help",
    body: "Stuck on a word or a grammar point? Ask other learners, start a discussion to share a tip, and upvote the most helpful answers. Search with or without accents, the asker can mark the answer that helped, and you're notified when someone answers or replies. Moderators keep it friendly. For members 13 and older with a verified email.",
    tone: "red",
    wide: true,
  },
] as const;

const COMING_SOON = [
  { icon: "📖", label: "Grammar lessons with Cô Tươi and Thầy Vinh" },
  { icon: "🎧", label: "Reading and listening practice" },
  { icon: "📱", label: "iPhone and Android apps" },
];

const STEPS = [
  { title: "Create a free account", body: "Sign up with your email or Google in under a minute." },
  { title: "Pick your daily goals", body: "Decide how many new words to learn each day — you can change it any time." },
  { title: "Study a few minutes a day", body: "Review your flashcards, look up words, and feed Rồng Con as you hit your goals." },
];

const FAQ = [
  {
    q: "Is JustViet free?",
    a: "Yes — everything is free while JustViet is in early access. Later we plan to offer a monthly subscription with a free trial, so you can try it all before paying. We'll let you know well before anything changes, and you'll never be charged without signing up for a plan yourself.",
  },
  {
    q: "Who is JustViet for?",
    a: "Anyone learning Vietnamese, from your very first “xin chào” to intermediate learners building a bigger vocabulary. It's in English, and you don't need to know anything to start.",
  },
  {
    q: "Can I use it on my phone?",
    a: "Yes. JustViet works in your phone's web browser today. Native iPhone and Android apps are on the way, and they'll use the same account, so your progress comes with you.",
  },
  {
    q: "Can I study my own words?",
    a: "Yes. Add words to your flashcards from the dictionary in one click, write your own cards, or paste a list straight from Excel or Google Sheets.",
  },
  {
    q: "What do you do with my data?",
    a: "We use it to run JustViet and keep your progress in sync. Your learning data is private to your account; what you post in the Community is visible to other signed-in members. No ads, and we don't sell your information.",
    link: { href: "/privacy", label: "Read the privacy policy" },
  },
];

function SectionHeading({ eyebrow, title, intro, id }: { eyebrow: string; title: string; intro?: string; id: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-heading text-sm font-extrabold tracking-wide text-red-500 uppercase">{eyebrow}</p>
      <h2 id={id} className="font-heading mt-1 scroll-mt-28 text-3xl font-extrabold text-ink-900 sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 text-lg text-ink-700">{intro}</p>}
    </div>
  );
}

/** A static picture of a study session — the hero's "screenshot", built from real UI pieces. */
function StudyPreview() {
  return (
    <div className="relative mx-auto w-full max-w-sm" aria-hidden="true">
      <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-3 rounded-3xl border-2 border-yellow-200 bg-yellow-100" />
      <div className="relative flex flex-col gap-5 rounded-3xl border-2 border-ink-300/30 bg-surface p-6 shadow-[0_6px_0_rgba(74,47,34,0.08)]">
        <div className="flex items-center justify-between">
          <span className="rounded-full bg-ink-300/20 px-2.5 py-1 text-xs font-bold tracking-wide text-ink-700 uppercase">
            Phrase
          </span>
          <span className="text-xs font-bold text-ink-500">12 / 15 today</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-ink-300/20">
          <div className="h-full w-4/5 rounded-full bg-red-500" />
        </div>
        <div className="flex flex-col items-center gap-3 py-2 text-center">
          <p className="font-heading text-4xl font-extrabold text-ink-900" lang="vi">
            Bạn khỏe không?
          </p>
          <div className="w-full border-t-2 border-dashed border-ink-300/30 pt-3">
            <p className="text-xl font-bold text-ink-700">How are you?</p>
            <p className="mt-1 text-sm text-ink-500 italic" lang="vi">
              “Dạo này bạn khỏe không?”
            </p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2 text-center">
          {[
            ["Again", "1m", "bg-red-50 border-red-200 text-red-600"],
            ["Hard", "6m", "bg-yellow-50 border-yellow-300 text-yellow-600"],
            ["Good", "1d", "bg-success/10 border-success/40 text-success-dark"],
            ["Easy", "4d", "bg-sky-50 border-sky-200 text-sky-700"],
          ].map(([label, time, cls]) => (
            <div key={label} className={`font-heading rounded-xl border-2 border-b-4 px-1 py-2 text-xs font-bold uppercase ${cls}`}>
              {label}
              <span className="block text-[11px] font-semibold normal-case opacity-80">{time}</span>
            </div>
          ))}
        </div>
      </div>
      <div className="absolute -top-4 -left-1 flex items-center gap-2 sm:-left-4 rounded-2xl border-2 border-yellow-300 bg-yellow-50 px-3 py-2 shadow-[0_4px_0_rgba(74,47,34,0.08)]">
        <span className="text-2xl">🐉</span>
        <span className="text-xs font-bold text-ink-700">
          Rồng Con
          <span className="block font-semibold text-ink-500">Level 4 · +1 XP</span>
        </span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  return (
    <>
      {/* ------------------------------------------------------------ hero */}
      <section className="relative overflow-hidden bg-linear-to-b from-yellow-100 via-paper to-paper" aria-labelledby="hero-title">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-14 sm:px-6 md:grid-cols-[1.15fr_1fr] md:py-20">
          <div className="text-center sm:text-left">
            <p className="font-heading text-sm font-extrabold tracking-wide text-red-500 uppercase" lang="vi">
              Học tiếng Việt · Learn Vietnamese
            </p>
            <h1 id="hero-title" className="font-heading mt-2 text-4xl leading-tight font-extrabold text-ink-900 sm:text-5xl lg:text-6xl">
              Learn Vietnamese a little every day — and actually remember it.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-700 sm:text-xl">
              Smart flashcards, a tone-aware dictionary, and Rồng Con — a baby dragon who grows as you study. A few
              minutes a day adds up fast.
            </p>
            <div className="mt-8">
              <HeroCtas />
            </div>
            <p className="mt-4 text-sm font-semibold text-ink-500">Free during early access · No credit card needed</p>
          </div>
          <StudyPreview />
        </div>
      </section>

      {/* -------------------------------------------------------- features */}
      <section className="px-4 py-16 sm:px-6 md:py-24" aria-labelledby="features">
        <SectionHeading
          id="features"
          eyebrow="Features"
          title="Everything you need to build real vocabulary"
          intro="JustViet focuses on the hardest part of learning a language: remembering what you study."
        />
        <ul className="mx-auto mt-12 grid max-w-6xl gap-5 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li
              key={f.title}
              className={`flex flex-col gap-3 rounded-3xl border-2 p-6 shadow-[0_4px_0_rgba(74,47,34,0.06)] ${"wide" in f && f.wide ? "sm:col-span-2" : ""} ${
                f.tone === "red" ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <span className="text-4xl" aria-hidden="true">
                {f.icon}
              </span>
              <h3 className="font-heading text-xl font-extrabold text-ink-900">{f.title}</h3>
              <p className="text-ink-700">{f.body}</p>
            </li>
          ))}
        </ul>

        <div className="mx-auto mt-10 max-w-6xl rounded-3xl border-2 border-dashed border-ink-300/50 bg-surface p-6">
          <h3 className="font-heading text-lg font-extrabold text-ink-900">
            Coming soon <span className="text-sm font-bold text-ink-500">· what we&apos;re building next</span>
          </h3>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {COMING_SOON.map((item) => (
              <li key={item.label} className="flex items-center gap-3 font-semibold text-ink-700">
                <span className="text-2xl" aria-hidden="true">
                  {item.icon}
                </span>
                {item.label}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ---------------------------------------------------- how it works */}
      <section className="bg-surface px-4 py-16 sm:px-6 md:py-24" aria-labelledby="how-it-works">
        <SectionHeading id="how-it-works" eyebrow="How it works" title="Three steps to your first word" />
        <ol className="mx-auto mt-12 grid max-w-5xl gap-5 md:grid-cols-3">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex flex-col gap-3 rounded-3xl border-2 border-ink-300/30 bg-paper p-6">
              <span className="font-heading flex h-11 w-11 items-center justify-center rounded-2xl border-b-4 border-red-700 bg-red-500 text-xl font-extrabold text-white">
                {i + 1}
              </span>
              <h3 className="font-heading text-xl font-extrabold text-ink-900">{step.title}</h3>
              <p className="text-ink-700">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* --------------------------------------------------------- pricing */}
      <section className="px-4 py-16 sm:px-6 md:py-24" aria-labelledby="pricing">
        <SectionHeading id="pricing" eyebrow="Pricing" title="Free while we're in early access" />
        <div className="mx-auto mt-10 grid max-w-4xl gap-5 md:grid-cols-2">
          <div className="flex flex-col gap-4 rounded-3xl border-2 border-red-300 bg-surface p-7 shadow-[0_6px_0_rgba(74,47,34,0.08)]">
            <p className="font-heading text-sm font-extrabold tracking-wide text-red-500 uppercase">Early access</p>
            <p className="font-heading text-5xl font-extrabold text-ink-900">
              Free
            </p>
            <ul className="flex flex-col gap-2 text-ink-700">
              <li>✓ Every feature that&apos;s live today</li>
              <li>✓ Unlimited flashcards and dictionary lookups</li>
              <li>✓ Daily goals, XP and Rồng Con</li>
              <li>✓ Your progress saved to your account</li>
            </ul>
            <div className="mt-auto pt-2">
              <HeroCtas align="center" />
            </div>
          </div>
          <div className="flex flex-col gap-4 rounded-3xl border-2 border-dashed border-ink-300/50 bg-paper p-7">
            <p className="font-heading text-sm font-extrabold tracking-wide text-ink-500 uppercase">Coming later</p>
            <p className="font-heading text-3xl font-extrabold text-ink-900">Monthly plan with a free trial</p>
            <p className="text-ink-700">
              As new lessons and features arrive, we plan to offer a monthly subscription — with a free trial first, so
              you can try everything before you decide.
            </p>
            <p className="text-sm text-ink-500">
              We&apos;ll tell you well before anything changes, and you&apos;ll never be charged unless you choose a
              plan yourself.
            </p>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------- faq */}
      <section className="bg-surface px-4 py-16 sm:px-6 md:py-24" aria-labelledby="faq">
        <SectionHeading id="faq" eyebrow="FAQ" title="Questions? Câu hỏi?" />
        <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-3">
          {FAQ.map((item) => (
            <details key={item.q} className="group rounded-2xl border-2 border-ink-300/30 bg-paper px-5 py-4 open:bg-surface">
              <summary className="font-heading flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-extrabold text-ink-900 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200 [&::-webkit-details-marker]:hidden">
                {item.q}
                <span className="text-2xl leading-none text-red-500 transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-ink-700">
                {item.a}
                {"link" in item && item.link && (
                  <>
                    {" "}
                    <Link href={item.link.href} className="font-bold text-red-500 underline-offset-2 hover:underline">
                      {item.link.label}
                    </Link>
                    .
                  </>
                )}
              </p>
            </details>
          ))}
        </div>
      </section>

      {/* ------------------------------------------------------- final cta */}
      <section className="px-4 py-16 sm:px-6 md:py-24" aria-labelledby="cta-title">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-6 rounded-3xl border-2 border-red-200 bg-linear-to-br from-red-50 to-yellow-50 px-6 py-12 text-center shadow-[0_6px_0_rgba(74,47,34,0.08)]">
          <span className="text-5xl" aria-hidden="true">
            🥚
          </span>
          <h2 id="cta-title" className="font-heading text-3xl font-extrabold text-ink-900 sm:text-4xl">
            Rồng Con is waiting to hatch.
          </h2>
          <p className="max-w-xl text-lg text-ink-700">
            Start your first lesson today — it takes less than a minute to sign up.
          </p>
          <HeroCtas align="center" />
        </div>
      </section>
    </>
  );
}
