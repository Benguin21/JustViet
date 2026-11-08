import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_GOAL_SETTINGS, type GoalSettings } from "@/lib/companion/goals";
import { GoalsForm } from "./GoalsForm";

afterEach(cleanup);

const saved: GoalSettings = {
  enabled: { vocab: true, grammar: false, skills: false },
  targets: { vocab: 5, grammar: 1, skills: 1 },
};

function setup(locked = {}, onSave = vi.fn(async () => ({ locked }))) {
  render(<GoalsForm saved={saved} locked={locked} onSave={onSave} />);
  const slider = (name: string) => screen.getByRole("slider", { name }) as HTMLInputElement;
  return { onSave, slider };
}

describe("Goals tab", () => {
  it("shows a slider for Grammar, Vocab and Skills with whole-number ranges", () => {
    const { slider } = setup();
    const sliders = screen.getAllByRole("slider") as HTMLInputElement[];
    expect(sliders.map((s) => s.getAttribute("aria-labelledby"))).toEqual([
      "goal-grammar-title",
      "goal-vocab-title",
      "goal-skills-title",
    ]);
    for (const [name, min, max] of [
      ["Grammar", "1", "5"],
      ["Vocab", "1", "50"],
      ["Skills", "1", "5"],
    ]) {
      const s = slider(name);
      expect([s.type, s.min, s.max, s.step]).toEqual(["range", min, max, "1"]);
    }
    expect(slider("Vocab").value).toBe("5");
    expect(screen.getByTestId("goal-vocab-value").textContent).toBe("5new flashcards per day");
  });

  it("updates the number, tier and bonus as the slider moves", () => {
    const { slider } = setup();
    const vocab = slider("Vocab");
    const tier = () => screen.getByTestId("goal-vocab-tier").textContent;
    const cases: [number, string][] = [
      [4, "Starter · +0 XP"],
      [5, "Small · +10 XP"],
      [10, "Medium · +20 XP"],
      [14, "Medium · +20 XP"],
      [15, "Big · +30 XP"],
      [50, "Big · +30 XP"],
    ];
    for (const [n, label] of cases) {
      fireEvent.change(vocab, { target: { value: String(n) } });
      expect(tier()).toBe(label);
      expect(screen.getByTestId("goal-vocab-value").textContent).toBe(`${n}new flashcards per day`);
    }
    fireEvent.change(slider("Grammar"), { target: { value: "2" } });
    expect(screen.getByTestId("goal-grammar-tier").textContent).toBe("Medium · +20 XP");
    expect(slider("Grammar").getAttribute("aria-valuetext")).toBe("2 lessons per day, Medium goal, 20 bonus XP");
    fireEvent.change(slider("Skills"), { target: { value: "3" } });
    expect(screen.getByTestId("goal-skills-tier").textContent).toBe("Big · +30 XP");
  });

  it("darkens the selected track as the goal gets harder", () => {
    const { slider } = setup();
    const vocab = slider("Vocab");
    const thumb = () => vocab.style.getPropertyValue("--goal-thumb");
    fireEvent.change(vocab, { target: { value: "2" } });
    const easy = thumb();
    fireEvent.change(vocab, { target: { value: "30" } });
    expect(thumb()).not.toBe(easy);
    expect(vocab.style.getPropertyValue("--goal-track")).toContain("linear-gradient");
  });

  it("saves only when asked, and says when each change applies", async () => {
    const { slider, onSave } = setup({ vocab: 5 });
    const button = screen.getByRole("button", { name: "Save goals" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);

    fireEvent.change(slider("Vocab"), { target: { value: "15" } });
    fireEvent.change(slider("Grammar"), { target: { value: "2" } });
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
    // Today's Vocab goal is underway, so the card says the new target waits for tomorrow.
    expect(
      screen.getByText(
        "Today’s goal is already underway, so today stays at 5 new flashcards (Small · +10 XP). This target starts tomorrow.",
      ),
    ).toBeTruthy();

    await act(async () => {
      fireEvent.click(button);
    });
    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith({
      enabled: saved.enabled,
      targets: { vocab: 15, grammar: 2, skills: 1 },
    });
    expect(screen.getByRole("status").textContent).toContain("Grammar: 2 lessons per day, starting today.");
    expect(screen.getByRole("status").textContent).toContain(
      "Vocab: 15 new flashcards per day from tomorrow. Today’s goal is already underway, so it stays at 5 (Small · +10 XP).",
    );
  });

  it("keeps the on/off switches", async () => {
    const { onSave } = setup();
    const skills = screen.getByRole("switch", { name: "Show the Skills goal on Home" });
    expect(skills.getAttribute("aria-checked")).toBe("false");
    fireEvent.click(skills);
    expect(skills.getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
    });
    expect(onSave).toHaveBeenCalledWith({
      enabled: { ...saved.enabled, skills: true },
      targets: saved.targets,
    });
    expect(screen.getByRole("status").textContent).toContain("Skills is on, so it shows on Home.");
  });

  it("shows a failed save and keeps the changes", async () => {
    const onSave = vi.fn(async () => {
      throw new Error("You're offline.");
    });
    const { slider } = setup({}, onSave);
    fireEvent.change(slider("Grammar"), { target: { value: "4" } });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Save goals" }));
    });
    expect(screen.getByRole("alert").textContent).toBe("You're offline.");
    expect(slider("Grammar").value).toBe("4");
    expect(screen.getByText("You have unsaved changes.")).toBeTruthy();
  });

  it("starts from the defaults for a new learner", () => {
    render(<GoalsForm saved={DEFAULT_GOAL_SETTINGS} locked={{}} onSave={vi.fn()} />);
    expect((screen.getByRole("slider", { name: "Vocab" }) as HTMLInputElement).value).toBe("5");
  });
});
