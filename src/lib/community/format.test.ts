import { describe, expect, it } from "vitest";
import { parseInline, parseRichText, plainText, safeLink } from "./format";

describe("safeLink", () => {
  it("accepts http and https links and gives their domain", () => {
    expect(safeLink("https://www.example.com/a?b=1")).toEqual({ href: "https://www.example.com/a?b=1", domain: "example.com" });
    expect(safeLink("http://vi.wikipedia.org/wiki/Ph%E1%BB%9F")?.domain).toBe("vi.wikipedia.org");
  });

  it("refuses every other scheme, credentials and hostless URLs", () => {
    for (const bad of [
      "javascript:alert(1)",
      "JAVASCRIPT:alert(1)",
      "data:text/html,<b>x</b>",
      "vbscript:x",
      "file:///etc/passwd",
      "//example.com",
      "ftp://example.com",
      "https://user:pass@example.com",
      "https://localhost",
      "mailto:a@b.com",
      " javascript:alert(1)",
    ]) {
      expect(safeLink(bad), bad).toBeNull();
    }
  });

  it("shows internationalized domains in their punycode form", () => {
    expect(safeLink("https://аpple.com")?.domain).toMatch(/^xn--/);
  });
});

describe("parseInline", () => {
  it("parses bold, italic and code", () => {
    expect(parseInline("**đậm** and *nghiêng* and `mã`")).toEqual([
      { type: "bold", children: [{ type: "text", text: "đậm" }] },
      { type: "text", text: " and " },
      { type: "italic", children: [{ type: "text", text: "nghiêng" }] },
      { type: "text", text: " and " },
      { type: "code", text: "mã" },
    ]);
  });

  it("leaves lone or spaced asterisks alone", () => {
    expect(parseInline("2 * 3 * 4")).toEqual([{ type: "text", text: "2 * 3 * 4" }]);
    expect(parseInline("**not closed")).toEqual([{ type: "text", text: "**not closed" }]);
  });

  it("doesn't format inside code", () => {
    expect(parseInline("`**x**`")).toEqual([{ type: "code", text: "**x**" }]);
  });

  it("parses [label](url) links and bare URLs, trimming trailing punctuation", () => {
    expect(parseInline("See [Wiki](https://vi.wikipedia.org/wiki/Ph%E1%BB%9F).")).toEqual([
      { type: "text", text: "See " },
      { type: "link", href: "https://vi.wikipedia.org/wiki/Ph%E1%BB%9F", domain: "vi.wikipedia.org", label: "Wiki", bare: false },
      { type: "text", text: "." },
    ]);
    expect(parseInline("Try https://example.com/x, it helps")).toEqual([
      { type: "text", text: "Try " },
      { type: "link", href: "https://example.com/x", domain: "example.com", label: "https://example.com/x", bare: true },
      { type: "text", text: ", it helps" },
    ]);
  });

  it("shows unsafe links as plain text", () => {
    expect(parseInline("[click](javascript:alert(1))")).toEqual([{ type: "text", text: "[click](javascript:alert(1))" }]);
    expect(parseInline("[x](data:text/html;base64,AAAA)")).toEqual([{ type: "text", text: "[x](data:text/html;base64,AAAA)" }]);
  });

  it("keeps HTML as text", () => {
    expect(parseInline('<img src=x onerror="alert(1)">')).toEqual([{ type: "text", text: '<img src=x onerror="alert(1)">' }]);
  });

  it("allows formatting inside link labels' surroundings but not links in labels", () => {
    const nodes = parseInline("**[a](https://example.com)**");
    expect(nodes[0].type).toBe("bold");
  });
});

describe("parseRichText", () => {
  it("splits paragraphs on blank lines and keeps single newlines as breaks", () => {
    expect(parseRichText("Dòng 1\nDòng 2\n\nĐoạn 2")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "Dòng 1" }, { type: "br" }, { type: "text", text: "Dòng 2" }] },
      { type: "paragraph", children: [{ type: "text", text: "Đoạn 2" }] },
    ]);
  });

  it("parses bullet lists with - or *", () => {
    expect(parseRichText("Words:\n- một\n* hai\n\nDone")).toEqual([
      { type: "paragraph", children: [{ type: "text", text: "Words:" }] },
      { type: "list", items: [[{ type: "text", text: "một" }], [{ type: "text", text: "hai" }]] },
      { type: "paragraph", children: [{ type: "text", text: "Done" }] },
    ]);
  });

  it("doesn't mistake a bold line for a list item", () => {
    expect(parseRichText("**Note** this")[0].type).toBe("paragraph");
  });
});

describe("plainText", () => {
  it("flattens formatting", () => {
    expect(plainText("**Xin** *chào*\n\n- [link](https://example.com)")).toBe("Xin chào link");
  });
});
