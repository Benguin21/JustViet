import { describe, expect, it } from "vitest";
import { avatarClass, initialsFor, isAvatarColor } from "./avatar";

describe("initialsFor", () => {
  it("uses the first letters of the first two words", () => {
    expect(initialsFor("Bảo Ngọc")).toBe("BN");
    expect(initialsFor("nguyen_van.a")).toBe("NV");
    expect(initialsFor("Đức")).toBe("ĐỨ");
    expect(initialsFor("lan")).toBe("LA");
    expect(initialsFor("")).toBe("?");
  });
});

describe("avatar colours", () => {
  it("knows its palette", () => {
    expect(isAvatarColor("teal")).toBe(true);
    expect(isAvatarColor("neon")).toBe(false);
    expect(avatarClass("teal")).toBe("bg-avatar-teal");
    expect(avatarClass("neon")).toBe("bg-avatar-cocoa");
  });
});
