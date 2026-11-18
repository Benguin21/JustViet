import { Fragment, type ReactNode } from "react";
import { LINK_REL, parseRichText, type Inline } from "@/lib/community/format";

/**
 * Renders Community text (see format.ts) as React elements: never as an
 * HTML string. Links open in a new tab, are marked nofollow/ugc, and show
 * their domain next to the label so a label can't hide where it goes.
 */
function renderInline(nodes: Inline[]): ReactNode[] {
  return nodes.map((n, i) => {
    switch (n.type) {
      case "text":
        return <Fragment key={i}>{n.text}</Fragment>;
      case "br":
        return <br key={i} />;
      case "bold":
        return <strong key={i} className="font-extrabold text-ink-900">{renderInline(n.children)}</strong>;
      case "italic":
        return <em key={i}>{renderInline(n.children)}</em>;
      case "code":
        return (
          <code key={i} className="rounded-md bg-yellow-50 px-1.5 py-0.5 font-mono text-[0.9em] text-ink-900">
            {n.text}
          </code>
        );
      case "link":
        return (
          <Fragment key={i}>
            <a
              href={n.href}
              target="_blank"
              rel={LINK_REL}
              className="rounded font-bold text-red-600 underline underline-offset-2 hover:text-red-700 focus:outline-none focus-visible:ring-4 focus-visible:ring-yellow-200"
            >
              {n.label}
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
            {!n.bare && <span className="ml-1 text-xs font-semibold text-ink-500">({n.domain})</span>}
          </Fragment>
        );
    }
  });
}

export function RichText({ text, className = "" }: { text: string; className?: string }) {
  const blocks = parseRichText(text);
  return (
    <div className={`flex flex-col gap-3 leading-relaxed text-ink-700 [overflow-wrap:anywhere] ${className}`}>
      {blocks.map((b, i) =>
        b.type === "paragraph" ? (
          <p key={i}>{renderInline(b.children)}</p>
        ) : (
          <ul key={i} className="ml-5 flex list-disc flex-col gap-1">
            {b.items.map((item, j) => (
              <li key={j}>{renderInline(item)}</li>
            ))}
          </ul>
        ),
      )}
    </div>
  );
}
