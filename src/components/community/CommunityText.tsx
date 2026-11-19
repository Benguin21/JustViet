import { Fragment } from "react";
import { paragraphs } from "@/lib/community/format";

/**
 * Shows Community text: plain text only, as paragraphs with line breaks
 * (see format.ts). Rendered as React text, so nothing in it is ever HTML,
 * formatting or a link.
 */
export function CommunityText({ text, className = "" }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 leading-relaxed text-ink-700 [overflow-wrap:anywhere] ${className}`}>
      {paragraphs(text).map((lines, i) => (
        <p key={i}>
          {lines.map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {line}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
