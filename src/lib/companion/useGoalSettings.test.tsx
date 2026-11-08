import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { normalizeDay } from "@/lib/xp/plan";

const repo = vi.hoisted(() => ({
  fetchGoals: vi.fn(),
  fetchDay: vi.fn(),
  saveGoals: vi.fn(),
  awardVocabReview: vi.fn(),
  completeGrammarLesson: vi.fn(),
  completeSkill: vi.fn(),
  setGoalClaim: vi.fn(),
}));
vi.mock("@/lib/xp/repository", () => repo);
vi.mock("@/lib/auth-context", () => ({ useAuth: () => ({ user: { uid: "u1" } }) }));

import { DEFAULT_GOAL_SETTINGS } from "./goals";
import { useGoalSettings } from "./useGoalSettings";

beforeEach(() => {
  for (const f of Object.values(repo)) f.mockReset();
  repo.fetchGoals.mockResolvedValue({ settings: DEFAULT_GOAL_SETTINGS, timeZone: "Asia/Ho_Chi_Minh" });
  repo.fetchDay.mockImplementation(async (_uid: string, day: string) => normalizeDay({ targets: { vocab: 5 } }, day));
  repo.saveGoals.mockResolvedValue(undefined);
});

describe("useGoalSettings", () => {
  it("loads the saved goals and today's locks, in the learner's time zone", async () => {
    const { result } = renderHook(() => useGoalSettings());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.data!.saved).toEqual(DEFAULT_GOAL_SETTINGS);
    expect(result.current.data!.locked).toEqual({ vocab: 5 });
    const today = new Intl.DateTimeFormat("en-US", { timeZone: "Asia/Ho_Chi_Minh", year: "numeric", month: "numeric", day: "numeric" })
      .formatToParts(new Date())
      .reduce((o, p) => ({ ...o, [p.type]: p.value }), {} as Record<string, string>);
    expect(repo.fetchDay).toHaveBeenCalledWith("u1", `${today.year}-${today.month}-${today.day}`);
  });

  it("saves the goals with the established zone and never awards XP", async () => {
    const { result } = renderHook(() => useGoalSettings());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    const next = { ...DEFAULT_GOAL_SETTINGS, targets: { vocab: 20, grammar: 3, skills: 2 } };
    let after: Awaited<ReturnType<typeof result.current.save>> | undefined;
    await act(async () => {
      after = await result.current.save(next);
    });
    expect(repo.saveGoals).toHaveBeenCalledWith("u1", next, "Asia/Ho_Chi_Minh");
    expect(after!.locked).toEqual({ vocab: 5 });
    expect(result.current.data!.saved).toEqual(next);
    for (const f of [repo.awardVocabReview, repo.completeGrammarLesson, repo.completeSkill, repo.setGoalClaim]) {
      expect(f).not.toHaveBeenCalled();
    }
  });

  it("reports a failed save with a friendly message", async () => {
    repo.saveGoals.mockRejectedValue(Object.assign(new Error("offline"), { code: "unavailable" }));
    const { result } = renderHook(() => useGoalSettings());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    await expect(result.current.save(DEFAULT_GOAL_SETTINGS)).rejects.toThrow();
    expect(result.current.data!.saved).toEqual(DEFAULT_GOAL_SETTINGS);
  });

  it("shows an error, and retries, when the goals can't load", async () => {
    repo.fetchGoals.mockRejectedValueOnce(new Error("boom"));
    const { result } = renderHook(() => useGoalSettings());
    await waitFor(() => expect(result.current.error).not.toBeNull());
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.data).not.toBeNull());
    expect(result.current.error).toBeNull();
  });
});
