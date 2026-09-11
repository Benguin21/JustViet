import { describe, expect, it } from "vitest";
import { DEFAULT_SRS_SETTINGS, parseSteps, validateSrsSettings } from "./settings";

describe("validateSrsSettings", () => {
  it("accepts the defaults", () => {
    expect(validateSrsSettings(DEFAULT_SRS_SETTINGS)).toEqual({});
  });

  it("rejects a negative daily limit", () => {
    const errors = validateSrsSettings({ ...DEFAULT_SRS_SETTINGS, maxNewPerDay: -1 });
    expect(errors.maxNewPerDay).toBeDefined();
  });

  it("rejects malformed learning steps", () => {
    const errors = validateSrsSettings({
      ...DEFAULT_SRS_SETTINGS,
      learningSteps: ["soon", "later"],
    });
    expect(errors.learningSteps).toBeDefined();
  });

  it("rejects an empty learning steps list", () => {
    const errors = validateSrsSettings({ ...DEFAULT_SRS_SETTINGS, learningSteps: [] });
    expect(errors.learningSteps).toBeDefined();
  });

  it("rejects minimumInterval greater than maximumInterval", () => {
    const errors = validateSrsSettings({
      ...DEFAULT_SRS_SETTINGS,
      minimumInterval: 100,
      maximumInterval: 50,
    });
    expect(errors.minimumInterval).toBeDefined();
  });

  it("rejects a desired retention outside the sane 70-99% range", () => {
    expect(
      validateSrsSettings({ ...DEFAULT_SRS_SETTINGS, desiredRetention: 0.5 }).desiredRetention,
    ).toBeDefined();
    expect(
      validateSrsSettings({ ...DEFAULT_SRS_SETTINGS, desiredRetention: 1 }).desiredRetention,
    ).toBeDefined();
  });
});

describe("parseSteps", () => {
  it("splits on whitespace and commas, dropping empties", () => {
    expect(parseSteps("1m, 10m   1d")).toEqual(["1m", "10m", "1d"]);
  });
});
