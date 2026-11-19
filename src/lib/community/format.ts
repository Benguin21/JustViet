/**
 * Community text is plain text: no formatting and no links (links are
 * refused when posting; see `findLink` in limits.ts). `CommunityText.tsx`
 * shows it as paragraphs, split on blank lines, with single newlines kept
 * as line breaks. Anything that looks like markup (**bold**, [x](…)),
 * including text written before formatting was removed, shows exactly as
 * typed. Pure.
 */

/** The text's paragraphs, each a list of its (trimmed) lines. */
export function paragraphs(text: string): string[][] {
  const out: string[][] = [];
  let para: string[] = [];
  for (const line of text.replace(/\r\n?/g, "\n").split("\n")) {
    if (line.trim() === "") {
      if (para.length) out.push(para);
      para = [];
    } else {
      para.push(line.trim());
    }
  }
  if (para.length) out.push(para);
  return out;
}

/** The text on one line, for previews and snippets. */
export function plainText(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}
