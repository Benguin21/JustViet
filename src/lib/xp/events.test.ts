import { describe, expect, it } from "vitest";
import { isCardId, isSourceId, vocabEventId } from "./events";

describe("isCardId", () => {
  it("accepts every kind of Vocab card id the app creates", () => {
    expect(isCardId("Xy3kP9qL2mN8vB4tR7wZ")).toBe(true); // a random Firestore id
    // A card added from the Dictionary: "dict_" + the URL-encoded headword. These used to be
    // refused, so the card earned no XP and Home failed to open after studying it.
    const dict = `dict_${encodeURIComponent("cảm ơn")}`;
    expect(isSourceId(dict)).toBe(false);
    expect(isCardId(dict)).toBe(true);
    const phrase = `dict_${encodeURIComponent("không có gì, tôi rất vui được giúp đỡ bạn hôm nay")}`;
    expect(phrase.length).toBeGreaterThan(120);
    expect(isCardId(phrase)).toBe(true);
    expect(new TextEncoder().encode(vocabEventId("2026-11-19", phrase)).length).toBeLessThan(1500);
  });

  it("refuses ids that can't be (part of) a Firestore document id", () => {
    for (const bad of ["", "a/b", ".", "..", "__x__", "has space", "ăn", "x".repeat(1001), 42, null, undefined]) {
      expect(isCardId(bad)).toBe(false);
    }
  });
});
