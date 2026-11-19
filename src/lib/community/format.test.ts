import { describe, expect, it } from "vitest";
import { paragraphs, plainText } from "./format";

describe("paragraphs", () => {
  it("splits on blank lines and keeps single newlines as line breaks", () => {
    expect(paragraphs("Dòng 1\nDòng 2\n\n\nĐoạn 2")).toEqual([["Dòng 1", "Dòng 2"], ["Đoạn 2"]]);
    expect(paragraphs("a\r\n\r\nb")).toEqual([["a"], ["b"]]);
    expect(paragraphs("  \n\n")).toEqual([]);
  });

  it("leaves markup as typed", () => {
    expect(paragraphs("**Xin** *chào*\n- một\n[x](https://example.com)")).toEqual([
      ["**Xin** *chào*", "- một", "[x](https://example.com)"],
    ]);
    expect(paragraphs('<img src=x onerror="alert(1)">')).toEqual([['<img src=x onerror="alert(1)">']]);
  });
});

describe("plainText", () => {
  it("puts the text on one line", () => {
    expect(plainText("  Xin chào\n\nbạn   khỏe không? ")).toBe("Xin chào bạn khỏe không?");
  });
});
