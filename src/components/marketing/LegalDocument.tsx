import type { ReactNode } from "react";

export type LegalSection = { id: string; title: string; body: ReactNode };

/**
 * Layout for the Privacy Policy and Terms: title, "last updated" date, a
 * short summary, a table of contents and readable numbered sections.
 * Plain server component — no client JavaScript needed.
 */
export function LegalDocument({
  title,
  updated,
  summary,
  sections,
}: {
  title: string;
  updated: string;
  summary: ReactNode;
  sections: LegalSection[];
}) {
  return (
    <article className="px-4 py-12 sm:px-6 md:py-16">
      <header className="mx-auto max-w-3xl">
        <h1 className="font-heading text-4xl font-extrabold text-ink-900 sm:text-5xl">{title}</h1>
        <p className="mt-2 font-semibold text-ink-500">Last updated: {updated}</p>
        <div className="mt-6 rounded-3xl border-2 border-yellow-200 bg-yellow-50 p-5 text-ink-700 [&_li]:ml-5 [&_li]:list-disc [&_p+ul]:mt-2 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1">
          {summary}
        </div>
      </header>

      <nav aria-label="Contents" className="mx-auto mt-8 max-w-3xl rounded-3xl border-2 border-ink-300/30 bg-surface p-5">
        <h2 className="font-heading text-sm font-extrabold tracking-wide text-ink-900 uppercase">Contents</h2>
        <ol className="mt-3 grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
          {sections.map((section, i) => (
            <li key={section.id}>
              <a
                href={`#${section.id}`}
                className="rounded text-sm font-semibold text-ink-700 hover:text-red-500 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
              >
                {i + 1}. {section.title}
              </a>
            </li>
          ))}
        </ol>
      </nav>

      <div className="mx-auto mt-10 flex max-w-3xl flex-col gap-10">
        {sections.map((section, i) => (
          <section key={section.id} aria-labelledby={section.id} className="scroll-mt-24">
            <h2 id={section.id} className="font-heading scroll-mt-24 text-2xl font-extrabold text-ink-900">
              {i + 1}. {section.title}
            </h2>
            <div className="mt-3 flex flex-col gap-3 leading-relaxed text-ink-700 [&_a]:font-semibold [&_a]:text-red-500 [&_a]:underline-offset-2 hover:[&_a]:underline [&_h3]:mt-2 [&_h3]:font-bold [&_h3]:text-ink-900 [&_li]:ml-5 [&_li]:list-disc [&_strong]:text-ink-900 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
              {section.body}
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}
