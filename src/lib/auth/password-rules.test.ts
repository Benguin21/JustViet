import { describe, expect, it, vi } from "vitest";
import { checkPasswordBreach } from "./breach-check";
import { validateNewPassword } from "./new-password";
import {
  checkPasswordRules,
  containsPersonalInfo,
  isCommonPassword,
  PASSWORD_MIN_LENGTH,
  passwordStrength,
} from "./password-rules";

describe("checkPasswordRules", () => {
  it(`requires at least ${PASSWORD_MIN_LENGTH} characters`, () => {
    expect(checkPasswordRules("short pw")).toContain("too-short");
    expect(checkPasswordRules("nine char")).toContain("too-short"); // 9
    expect(checkPasswordRules("ten chars!")).not.toContain("too-short"); // 10
  });

  it("counts characters, not UTF-16 units (Vietnamese and emoji)", () => {
    expect(checkPasswordRules("mèo con ăn")).toEqual([]); // 10 letters/spaces
    expect(checkPasswordRules("🐉🐉🐉🐉🐉🐉🐉🐉🐉")).toContain("too-short"); // 9 emoji, 18 UTF-16 units
  });

  it("caps the length", () => {
    expect(checkPasswordRules("a".repeat(129))).toContain("too-long");
  });

  it("doesn't force symbols, numbers or uppercase", () => {
    expect(checkPasswordRules("correct horse battery staple")).toEqual([]);
    expect(checkPasswordRules("purple tiger river")).toEqual([]);
  });
});

describe("isCommonPassword", () => {
  it.each([
    "password123",
    "Password2024!",
    "P@ssw0rd1234",
    "iloveyou123",
    "qwertyuiop",
    "1234567890",
    "0987654321",
    "1q2w3e4r5t",
    "aaaaaaaaaa",
    "abababababab",
    "abcdefghij",
    "dragondragon",
    "letmein2025",
    "matkhau12345",
    "justviet123",
    "a1234567890",
    "!!!!!!!!!!!!",
  ])("flags %s", (password) => {
    expect(isCommonPassword(password)).toBe(true);
    expect(checkPasswordRules(password)).toContain("common");
  });

  it.each(["correct horse battery staple", "purple tiger river", "Cà phê sữa đá mỗi sáng", "x7#mK9pLq2vW"])(
    "accepts %s",
    (password) => {
      expect(isCommonPassword(password)).toBe(false);
    },
  );
});

describe("passwordStrength", () => {
  it("scores rejected passwords 0 with the reason as the hint", () => {
    expect(passwordStrength("short")).toMatchObject({ score: 0, label: "Too weak" });
    expect(passwordStrength("password123").score).toBe(0);
  });

  it("rewards length: a passphrase beats a short mixed password", () => {
    const passphrase = passwordStrength("correct horse battery staple");
    const short = passwordStrength("Tr0ub4dor&3");
    expect(passphrase.score).toBe(4);
    expect(passphrase.score).toBeGreaterThanOrEqual(short.score);
  });

  it("marks a plain 10-letter word as only fair-to-weak", () => {
    expect(passwordStrength("bluewhales").score).toBeLessThanOrEqual(2);
  });

  it("caps passwords containing the user's name or email at Weak", () => {
    const result = passwordStrength("ben-the-learner-2026", { email: "learner@example.com" });
    expect(result.score).toBe(1);
    expect(result.hint).toMatch(/name or email/);
  });
});

describe("containsPersonalInfo", () => {
  it("finds the email's local part or a name, ignoring case and accents", () => {
    expect(containsPersonalInfo("LINH loves pho", { name: "Mỹ Linh" })).toBe(true);
    // Name parts under 4 characters are too short to count ("Mỹ", "An").
    expect(containsPersonalInfo("my an loves pho", { name: "Mỹ An" })).toBe(false);
    expect(containsPersonalInfo("hello tranvan!", { email: "tranvan@example.com" })).toBe(true);
    expect(containsPersonalInfo("totally unrelated", { email: "tranvan@example.com", name: "Trần Văn" })).toBe(false);
  });
});

function rangeResponse(body: string, ok = true) {
  return vi.fn(async () => ({ ok, text: async () => body }) as unknown as Response);
}

// SHA-1("password123") = CBFDAC6008F9CAB4083784CBD1874F76618D2A97
const PASSWORD123_SUFFIX = "C6008F9CAB4083784CBD1874F76618D2A97";

describe("checkPasswordBreach", () => {
  it("sends only the first 5 hash characters, with padding requested", async () => {
    const fetchImpl = rangeResponse("");
    await checkPasswordBreach("password123", { fetchImpl });
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.pwnedpasswords.com/range/CBFDA");
    expect(url).not.toContain(PASSWORD123_SUFFIX);
    expect((init.headers as Record<string, string>)["Add-Padding"]).toBe("true");
  });

  it("reports a breach when the suffix is listed", async () => {
    const fetchImpl = rangeResponse(`0018A45C4D1DEF81644B54AB7F969B88D65:1\r\n${PASSWORD123_SUFFIX}:2254650\r\n`);
    expect(await checkPasswordBreach("password123", { fetchImpl })).toEqual({ status: "breached", count: 2254650 });
  });

  it("ignores padding rows (count 0)", async () => {
    const fetchImpl = rangeResponse(`${PASSWORD123_SUFFIX}:0\n`);
    expect(await checkPasswordBreach("password123", { fetchImpl })).toEqual({ status: "not-found" });
  });

  it("is 'not-found' when the suffix isn't listed", async () => {
    const fetchImpl = rangeResponse("0018A45C4D1DEF81644B54AB7F969B88D65:1\n");
    expect(await checkPasswordBreach("password123", { fetchImpl })).toEqual({ status: "not-found" });
  });

  it("is 'unavailable' (never blocks) when the request fails or errors", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    expect(await checkPasswordBreach("password123", { fetchImpl: failing })).toEqual({ status: "unavailable" });
    expect(await checkPasswordBreach("password123", { fetchImpl: rangeResponse("", false) })).toEqual({
      status: "unavailable",
    });
  });

  it("gives up after the timeout", async () => {
    const hanging = vi.fn(
      (_url: string, init?: RequestInit) =>
        new Promise<Response>((_, reject) => init?.signal?.addEventListener("abort", () => reject(new Error("aborted")))),
    );
    expect(await checkPasswordBreach("password123", { fetchImpl: hanging as unknown as typeof fetch, timeoutMs: 10 })).toEqual({
      status: "unavailable",
    });
  });
});

describe("validateNewPassword", () => {
  const notBreached = rangeResponse("");

  it("checks length and common passwords before calling the breach API", async () => {
    const fetchImpl = rangeResponse("");
    expect(await validateNewPassword("short", "short", { fetchImpl })).toMatchObject({ ok: false, field: "password" });
    expect(await validateNewPassword("password123", "password123", { fetchImpl })).toMatchObject({ ok: false, field: "password" });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("requires the confirmation to match", async () => {
    expect(await validateNewPassword("purple tiger river", "purple tiger rivers", { fetchImpl: notBreached })).toEqual({
      ok: false,
      field: "confirm",
      message: "Passwords don't match.",
    });
  });

  it("rejects a breached password", async () => {
    // SHA-1("purple tiger river") — compute the real suffix so the mock matches.
    const data = new TextEncoder().encode("purple tiger river");
    const hex = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-1", data)), (b) => b.toString(16).padStart(2, "0"))
      .join("")
      .toUpperCase();
    const fetchImpl = rangeResponse(`${hex.slice(5)}:12\n`);
    expect(await validateNewPassword("purple tiger river", "purple tiger river", { fetchImpl })).toMatchObject({
      ok: false,
      field: "password",
      message: expect.stringMatching(/data breach/),
    });
  });

  it("allows the password when the breach check can't run", async () => {
    const failing = vi.fn(async () => {
      throw new TypeError("offline");
    });
    expect(await validateNewPassword("purple tiger river", "purple tiger river", { fetchImpl: failing })).toEqual({ ok: true });
  });
});
