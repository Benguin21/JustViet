import type { Metadata } from "next";
import Link from "next/link";
import { GUIDELINES } from "@/lib/community/guidelines";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Community Guidelines",
  description: "How we keep the JustViet Community a friendly place to learn Vietnamese.",
  alternates: { canonical: "/guidelines" },
};

/**
 * The community guidelines, public so the Terms can link to them. The same
 * list (src/lib/community/guidelines.ts) is shown in the app before a
 * member's first contribution.
 */
export default function GuidelinesPage() {
  return (
    <article className="px-4 py-12 sm:px-6 md:py-16">
      <div className="mx-auto flex max-w-3xl flex-col gap-6">
        <header>
          <h1 className="font-heading text-4xl font-extrabold text-ink-900 sm:text-5xl">Community Guidelines</h1>
          <p className="mt-3 text-lg text-ink-700">
            The JustViet Community is where learners ask questions about Vietnamese, share what they&apos;ve learned and help
            each other. It&apos;s for members 13 and older with a verified email. Everyone agrees to these guidelines before
            their first post.
          </p>
        </header>
        <ol className="flex flex-col gap-4">
          {GUIDELINES.map((g, i) => (
            <li key={g.title} className="flex gap-4 rounded-3xl border-2 border-ink-300/30 bg-surface p-5">
              <span className="font-heading flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-100 font-extrabold text-yellow-600">
                {i + 1}
              </span>
              <div>
                <h2 className="font-heading text-xl font-extrabold text-ink-900">{g.title}</h2>
                <p className="mt-1 text-ink-700">{g.body}</p>
              </div>
            </li>
          ))}
        </ol>
        <section className="flex flex-col gap-3 rounded-3xl border-2 border-yellow-200 bg-yellow-50 p-5 text-ink-700">
          <h2 className="font-heading text-xl font-extrabold text-ink-900">Votes, reports and blocking</h2>
          <p>
            Upvote helpful contributions and downvote unhelpful or incorrect ones. Votes are private, and low scores never hide
            content or limit anyone. Use Report for anything that breaks these guidelines: reports are confidential and are
            reviewed by the JustViet team; nothing is removed automatically. You can also hide posts and block accounts
            for yourself.
          </p>
          <p>
            Breaking these guidelines or our <Link href="/terms" className="font-bold text-red-600 underline-offset-2 hover:underline">Terms of Service</Link>{" "}
            can lead to content being removed or an account being limited. Questions? Email{" "}
            <a href={`mailto:${SITE.contactEmail}`} className="font-bold text-red-600 underline-offset-2 hover:underline">
              {SITE.contactEmail}
            </a>
            .
          </p>
        </section>
      </div>
    </article>
  );
}
