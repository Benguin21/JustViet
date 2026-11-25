import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings } from "@/lib/companion/goals";
import { GoalsForm } from "./GoalsForm";

afterEach(cleanup);

const saved: GoalSettings = {
  enabled: { vocab: true, grammar: false, skills: false },
  targets: { vocab: 5, grammar: 1, skills: 1 },
};

function setup(locked = {}, onSave = vi.fn(async () => ({ locked })), start: GoalSettings = saved) {
  render(<GoalsForm saved={start} locked={locked} onSave={onSave} />);
  const group = (name: string) => screen.getByRole("radiogroup", { name });
  const option = (goal: string, name: string | RegExp) => within(group(goal)).getByRole("radio", { name });
  const checked = (goal: string) =>
    within(group(goal))
      .getAllByRole("radio")
      .filter((r) => r.getAttribute("aria-checked") === "true")
      .map((r) => r.getAttribute("aria-label"));
  const filled = (goal: string) =>
    within(group(goal))
      .getAllByRole("radio")
      .slice(1)
      .map((b) => (b.hasAttribute("data-filled") ? "■" : "□"))
      .join("");
  const save = () => screen.getByRole("button", { name: "Save goals" }) as HTMLButtonElement;
  return { onSave, group, option, checked, filled, save };
}

describe("Goals tab", () => {
  it("shows a 0 option and five numbered blocks for Grammar, Vocab and Skills, with no switches", () => {
    const { group, checked, filled } = setup();
    const groups = screen.getAllByRole("radiogroup");
    expect(groups.map((g) => g.getAttribute("aria-labelledby"))).toEqual([
      "goal-grammar-title",
      "goal-vocab-title",
      "goal-skills-title",
    ]);
    expect(screen.queryAllByRole("switch")).toHaveLength(0);
    expect(screen.queryAllByRole("slider")).toHaveLength(0);
    expect(within(group("Vocab")).getAllByRole("radio").map((r) => r.getAttribute("aria-label"))).toEqual([
      "0 new flashcards per day, goal off",
      "5 new flashcards per day, Small goal, 10 bonus XP",
      "10 new flashcards per day, Medium goal, 20 bonus XP",
      "15 new flashcards per day, Big goal, 30 bonus XP",
      "20 new flashcards per day, Big goal, 30 bonus XP",
      "25 new flashcards per day, Big goal, 30 bonus XP",
    ]);
    expect(checked("Vocab")).toEqual(["5 new flashcards per day, Small goal, 10 bonus XP"]);
    expect(filled("Vocab")).toBe("■□□□□");
    expect(screen.getByTestId("goal-vocab-value").textContent).toBe("5 new flashcards per day");
    expect(within(group("Vocab")).getAllByRole("radio").map((r) => r.textContent)).toEqual(["0", "5", "10", "15", "20", "25"]);
    // Grammar and Skills start off.
    expect(checked("Grammar")).toEqual(["0 lessons per day, goal off"]);
    expect(filled("Grammar")).toBe("□□□□□");
    expect(screen.getByTestId("goal-grammar-value").textContent).toBe("0 lessons per day");
    expect(screen.getByTestId("goal-grammar-tier").textContent).toBe("Goal off 0 XP");
  });

  it("fills every block up to the one picked, and updates the number and badge", () => {
    const { option, filled } = setup();
    const tier = () => screen.getByTestId("goal-vocab-tier").textContent;
    const cases: [number, string, string][] = [
      [15, "■■■□□", "Big goal +30 XP"],
      [10, "■■□□□", "Medium goal +20 XP"],
      [25, "■■■■■", "Big goal +30 XP"],
      [5, "■□□□□", "Small goal +10 XP"],
    ];
    for (const [n, bar, label] of cases) {
      fireEvent.click(option("Vocab", new RegExp(`^${n} new flashcards`)));
      expect(filled("Vocab")).toBe(bar);
      expect(tier()).toBe(label);
      expect(screen.getByTestId("goal-vocab-value").textContent).toBe(`${n} new flashcards per day`);
    }
    fireEvent.click(option("Grammar", /^2 lessons/));
    expect(filled("Grammar")).toBe("■■□□□");
    expect(screen.getByTestId("goal-grammar-tier").textContent).toBe("Medium goal +20 XP");
    fireEvent.click(option("Skills", /^4 activities/));
    expect(filled("Skills")).toBe("■■■■□");
    expect(screen.getByTestId("goal-skills-tier").textContent).toBe("Big goal +30 XP");
  });

  it("darkens the filled blocks toward the harder end", () => {
    const { option } = setup();
    fireEvent.click(option("Vocab", /^25 new/));
    const colours = [5, 10, 15, 20, 25].map((n) =>
      screen.getByTestId(`goal-vocab-block-${n}`).style.getPropertyValue("--goal-block"),
    );
    expect(new Set(colours).size).toBe(5);
  });

  it("does nothing when the selected block is tapped again", () => {
    const { option, checked, save } = setup();
    fireEvent.click(option("Vocab", /^5 new/));
    expect(checked("Vocab")).toEqual(["5 new flashcards per day, Small goal, 10 bonus XP"]);
    expect(save().disabled).toBe(true);
  });

  it("moves the selection with the arrow keys, from one Tab stop", () => {
    const { group, option, checked } = setup();
    const radios = within(group("Vocab")).getAllByRole("radio");
    expect(radios.map((r) => r.tabIndex)).toEqual([-1, 0, -1, -1, -1, -1]);
    fireEvent.keyDown(option("Vocab", /^5 new/), { key: "ArrowRight" });
    expect(checked("Vocab")).toEqual(["10 new flashcards per day, Medium goal, 20 bonus XP"]);
    expect(document.activeElement).toBe(option("Vocab", /^10 new/));
    fireEvent.keyDown(document.activeElement!, { key: "End" });
    expect(checked("Vocab")).toEqual(["25 new flashcards per day, Big goal, 30 bonus XP"]);
    fireEvent.keyDown(document.activeElement!, { key: "ArrowRight" });
    expect(checked("Vocab")).toEqual(["25 new flashcards per day, Big goal, 30 bonus XP"]);
    fireEvent.keyDown(document.activeElement!, { key: "Home" });
    expect(checked("Vocab")).toEqual(["0 new flashcards per day, goal off"]);
    expect(document.activeElement).toBe(option("Vocab", /goal off$/));
  });

  it("saves only when asked, and says when each change applies", async () => {
    const { option, onSave, save } = setup({ vocab: 5 });
    expect(save().disabled).toBe(true);

    fireEvent.click(option("Vocab", /^15 new/));
    fireEvent.click(option("Grammar", /^2 lessons/));
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
    // Today's Vocab goal is underway, so the card says the new target waits for tomorrow.
    expect(
      screen.getByText(
        "Today’s goal is already underway, so today stays at 5 new flashcards (Small goal · +10 XP). This target starts tomorrow.",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(save());
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      enabled: { ...saved.enabled, grammar: true },
      targets: { vocab: 15, grammar: 2, skills: 1 },
    });
    const status = screen.getByRole("status").textContent;
    expect(status).toContain("Grammar is on, so it shows on Home.");
    expect(status).toContain("Grammar: 2 lessons per day, starting today.");
    expect(status).toContain(
      "Vocab: 15 new flashcards per day from tomorrow. Today’s goal is already underway, so it stays at 5 (Small goal · +10 XP).",
    );
  });

  it("turns a goal off with 0, keeping its last target", async () => {
    const { option, onSave, save, filled } = setup({ vocab: 5 });
    fireEvent.click(option("Vocab", /^20 new/));
    fireEvent.click(option("Vocab", /goal off$/));
    expect(filled("Vocab")).toBe("□□□□□");
    expect(screen.getByTestId("goal-vocab-value").textContent).toBe("0 new flashcards per day");
    expect(screen.getByTestId("goal-vocab-tier").textContent).toBe("Goal off 0 XP");
    // Off takes effect straight away, so there's no "starts tomorrow" note.
    expect(screen.queryByText(/already underway/)).toBeNull();
    await act(async () => {
      fireEvent.click(save());
    });
    expect(onSave).toHaveBeenLastCalledWith({
      enabled: { vocab: false, grammar: false, skills: false },
      targets: { vocab: 20, grammar: 1, skills: 1 },
    });
    expect(screen.getByRole("status").textContent).toBe("Vocab is off, so Home won’t show it.");
  });

  it("re-enables an off goal by picking any block", () => {
    const { option, checked, filled } = setup();
    fireEvent.click(option("Skills", /^3 activities/));
    expect(checked("Skills")).toEqual(["3 activities per day, Big goal, 30 bonus XP"]);
    expect(filled("Skills")).toBe("■■■□□");
    expect(screen.getByTestId("goal-skills-value").textContent).toBe("3 activities per day");
  });

  it("lets all three goals be off at once", async () => {
    const { option, onSave, save } = setup();
    fireEvent.click(option("Vocab", /goal off$/));
    await act(async () => {
      fireEvent.click(save());
    });
    expect(onSave).toHaveBeenCalledWith({
      enabled: { vocab: false, grammar: false, skills: false },
      targets: saved.targets,
    });
  });

  it("shows an old target as its nearest choice, saving it only when asked", async () => {
    const old: GoalSettings = { enabled: { vocab: true, grammar: false, skills: false }, targets: { vocab: 7, grammar: 1, skills: 1 } };
    const { checked, onSave, save, option } = setup({}, undefined, old);
    expect(checked("Vocab")).toEqual(["5 new flashcards per day, Small goal, 10 bonus XP"]);
    expect(
      screen.getByText(
        "Your saved goal is 7 new flashcards a day, which isn’t one of the choices any more. Save goals to switch to 5 new flashcards.",
      ),
    ).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
    expect(save().disabled).toBe(false);
    // Picking another target replaces the note.
    fireEvent.click(option("Vocab", /^10 new/));
    expect(screen.queryByText(/isn’t one of the choices/)).toBeNull();
    fireEvent.click(option("Vocab", /^5 new/));
    await act(async () => {
      fireEvent.click(save());
    });
    expect(onSave).toHaveBeenCalledWith({ ...old, targets: { ...old.targets, vocab: 5 } });
  });

  it("keeps an off goal's old target untouched", () => {
    const old: GoalSettings = { enabled: { vocab: false, grammar: false, skills: false }, targets: { vocab: 30, grammar: 1, skills: 1 } };
    const { checked, save } = setup({}, undefined, old);
    expect(checked("Vocab")).toEqual(["0 new flashcards per day, goal off"]);
    expect(save().disabled).toBe(true);
    expect(screen.queryByText(/isn’t one of the choices/)).toBeNull();
  });

  it("shows today's target exactly when it was locked under the old slider", () => {
    setup({ vocab: 3 });
    expect(
      screen.getByText(
        "Today’s goal is already underway, so today stays at 3 new flashcards (Starter goal · +0 XP). This target starts tomorrow.",
      ),
    ).toBeTruthy();
  });

  it("shows a failed save and keeps the changes", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("You're offline.");
    });
    const { option, checked, save } = setup({}, onSave);
    fireEvent.click(option("Grammar", /^4 lessons/));
    await act(async () => {
      fireEvent.click(save());
    });
    expect(screen.getByRole("alert").textContent).toBe("You're offline.");
    expect(checked("Grammar")).toEqual(["4 lessons per day, Big goal, 30 bonus XP"]);
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
  });

  it("starts from the defaults for a new learner", () => {
    const { checked } = setup({}, undefined, DEFAULT_GOAL_SETTINGS);
    expect(checked("Vocab")).toEqual(["5 new flashcards per day, Small goal, 10 bonus XP"]);
  });
});
