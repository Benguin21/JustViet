import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "@/lib/vocab/settings";
import { VocabIntro } from "./VocabIntro";

afterEach(cleanup);

function setup() {
  const onClose = vi.fn();
  const onFinish = vi.fn();
  render(<VocabIntro settings={DEFAULT_SRS_SETTINGS} finish={{ label: "Add my first card", onClick: onFinish }} onClose={onClose} />);
  const next = () => fireEvent.click(screen.getByRole("button", { name: "Next" }));
  return { onClose, onFinish, next };
}

describe("VocabIntro", () => {
  it("walks through the steps with both teachers and ends on the finish button", () => {
    const { onFinish, next } = setup();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-label")).toBe("How Vocabulary works, step 1 of 5");
    expect(dialog.textContent).toContain("Cô Tươi");
    next();
    expect(dialog.getAttribute("aria-label")).toBe("How Vocabulary works, step 2 of 5");
    expect(dialog.textContent).toContain("Thầy Vinh");
    next();
    next();
    next();
    fireEvent.click(screen.getByRole("button", { name: "Add my first card" }));
    expect(onFinish).toHaveBeenCalledTimes(1);
  });

  it("has a practice card that reveals its meaning and explains each rating", () => {
    const { next } = setup();
    next();
    next();
    next();
    expect(screen.getAllByText("thank you")).toHaveLength(1); // only on step 1's sample cards
    fireEvent.click(screen.getByRole("button", { name: "Show answer" }));
    expect(screen.getAllByText("thank you")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Show answer" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Again/ }));
    expect(screen.getByText(/Forgotten words come back soon, in 1 min/)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Good/ }));
    expect(screen.getByText(/It comes back in 10 min/)).toBeTruthy();
  });

  it("can be skipped with the Skip button or Esc", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Skip intro" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
