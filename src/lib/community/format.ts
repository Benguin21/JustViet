/**
 * The Community's small formatting language, parsed to a tree that
 * `RichText.tsx` turns into React elements (never HTML strings, never
 * `dangerouslySetInnerHTML`). Pure.
 *
 *   Paragraphs           separated by a blank line; a single newline is a line break
 *   - item / * item      bullet list (one level)
 *   **bold**  *italic*  `inline code`
 *   [label](https://…)   a link; bare https://… URLs are linked too
 *
 * Links: http and https only, no user:password@ part. Anything else stays
 * plain text. Each link carries its domain so the UI can show it next to
 * the label, and opens in a new tab with rel="nofollow ugc noopener noreferrer".
 * No images, headings, HTML or nesting beyond bold/italic.
 */

export type Inline =
  | { type: "text"; text: string }
  | { type: "bold"; children: Inline[] }
  | { type: "italic"; children: Inline[] }
  | { type: "code"; text: string }
  | { type: "link"; href: string; domain: string; label: string; bare: boolean }
  | { type: "br" };

export type Block = { type: "paragraph"; children: Inline[] } | { type: "list"; items: Inline[][] };

export const LINK_REL = "nofollow ugc noopener noreferrer";

/** A safe link target, or null: http(s) only, a real host, no embedded credentials. */
export function safeLink(raw: string): { href: string; domain: string } | null {
  const text = raw.trim();
  if (!/^https?:\/\//i.test(text)) return null;
  let url: URL;
  try {
    url = new URL(text);
  } catch {
    return null;
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") return null;
  if (url.username || url.password) return null;
  if (!url.hostname || !url.hostname.includes(".")) return null;
  return { href: url.href, domain: url.hostname.replace(/^www\./, "") };
}

const LIST_ITEM = /^\s*[-*]\s+(.*)$/;

/** Splits text into paragraphs and bullet lists. */
export function parseRichText(text: string): Block[] {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: Block[] = [];
  let para: string[] = [];
  let list: string[] = [];

  const flushPara = () => {
    if (para.length) blocks.push({ type: "paragraph", children: parseLines(para) });
    para = [];
  };
  const flushList = () => {
    if (list.length) blocks.push({ type: "list", items: list.map((item) => parseInline(item)) });
    list = [];
  };

  for (const line of lines) {
    if (line.trim() === "") {
      flushPara();
      flushList();
      continue;
    }
    const item = LIST_ITEM.exec(line);
    if (item && !/^\s*\*\*/.test(line)) {
      flushPara();
      list.push(item[1]);
    } else {
      flushList();
      para.push(line.trim());
    }
  }
  flushPara();
  flushList();
  return blocks;
}

function parseLines(lines: string[]): Inline[] {
  const out: Inline[] = [];
  lines.forEach((line, i) => {
    if (i > 0) out.push({ type: "br" });
    out.push(...parseInline(line));
  });
  return out;
}

const BARE_URL = /^https?:\/\/[^\s<>()[\]{}"']+/i;
const TRAILING_PUNCT = /[.,!?;:]+$/;

function pushText(out: Inline[], text: string) {
  if (!text) return;
  const last = out[out.length - 1];
  if (last && last.type === "text") last.text += text;
  else out.push({ type: "text", text });
}

/** Parses one line of inline formatting. `allowLinks` is off inside link labels. */
export function parseInline(src: string, allowLinks = true): Inline[] {
  const out: Inline[] = [];
  let i = 0;
  while (i < src.length) {
    const rest = src.slice(i);

    if (rest[0] === "`") {
      const end = src.indexOf("`", i + 1);
      if (end > i + 1) {
        out.push({ type: "code", text: src.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    if (rest.startsWith("**")) {
      const end = src.indexOf("**", i + 2);
      if (end > i + 2 && !/\s/.test(src[i + 2]) && !/\s/.test(src[end - 1])) {
        out.push({ type: "bold", children: parseInline(src.slice(i + 2, end), allowLinks) });
        i = end + 2;
        continue;
      }
    }

    if (rest[0] === "*" && rest[1] !== "*") {
      const end = findClosingStar(src, i + 1);
      if (end > i + 1 && !/\s/.test(src[i + 1]) && !/\s/.test(src[end - 1])) {
        out.push({ type: "italic", children: parseInline(src.slice(i + 1, end), allowLinks) });
        i = end + 1;
        continue;
      }
    }

    if (allowLinks && rest[0] === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest);
      if (m) {
        const link = safeLink(m[2]);
        if (link) {
          out.push({ type: "link", ...link, label: m[1].trim() || link.domain, bare: false });
        } else {
          // An unsafe target (javascript:, data:, …) is shown as plain text.
          pushText(out, m[0]);
        }
        i += m[0].length;
        continue;
      }
    }

    if (allowLinks && (rest[0] === "h" || rest[0] === "H")) {
      const m = BARE_URL.exec(rest);
      const prev = i > 0 ? src[i - 1] : " ";
      if (m && !/[\p{L}\p{N}]/u.test(prev)) {
        const url = m[0].replace(TRAILING_PUNCT, "");
        const link = safeLink(url);
        if (link) {
          out.push({ type: "link", ...link, label: url, bare: true });
          i += url.length;
          continue;
        }
      }
    }

    pushText(out, src[i]);
    i += 1;
  }
  return out;
}

function findClosingStar(src: string, from: number): number {
  for (let j = from; j < src.length; j++) {
    if (src[j] === "*" && src[j + 1] !== "*" && src[j - 1] !== "*") return j;
  }
  return -1;
}

/** Plain text of the formatted content, for previews and search snippets. */
export function plainText(text: string): string {
  const flat = (nodes: Inline[]): string =>
    nodes
      .map((n) => {
        switch (n.type) {
          case "text":
          case "code":
            return n.text;
          case "bold":
          case "italic":
            return flat(n.children);
          case "link":
            return n.label;
          case "br":
            return " ";
        }
      })
      .join("");
  return parseRichText(text)
    .map((b) => (b.type === "paragraph" ? flat(b.children) : b.items.map(flat).join(" · ")))
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
