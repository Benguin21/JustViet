import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SRS_SETTINGS } from "@/lib/vocab/settings";
import { createNewCardFields } from "@/lib/vocab/srs";
import type { CardRating, VocabCard } from "@/lib/vocab/types";
import { StudySession } from "./StudySession";

afterEach(cleanup);

const MIN = 60 * 1000;

function card(id: string, front: string): VocabCard {
  const now = Date.now();
  return {
    id,
    userId: "u",
    front,
    back: `${front} meaning`,
    exampleSentence: "",
    partOfSpeech: "",
    tags: [],
    pronunciation: "pro",
    notes: "a note",
    createdAt: now,
    updatedAt: now,
    ...createNewCardFields(new Date(now)),
  };
}

/** Rates as the app would, except the next due time is whatever the test says. */
function rater(dueIn: (c: VocabCard, r: CardRating) => number) {
  return vi.fn(async (c: VocabCard, r: CardRating): Promise<VocabCard> => ({
    ...c,
    state: "learning",
    due: Date.now() + dueIn(c, r),
  }));
}

async function rate(name: RegExp) {
  fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: name })));
}

describe("StudySession", () => {
  it("brings a learning card back this session only when its next step is soon", async () => {
    const onRate = rater((c) => (c.id === "a" ? 10 * MIN : 24 * 60 * MIN));
    render(<StudySession queue={[card("a", "ăn"), card("b", "đẹp")]} settings={DEFAULT_SRS_SETTINGS} onRate={onRate} onFinish={() => {}} />);
    await rate(/^Good/); // ăn: next step in 10 min, so it comes back
    expect(screen.getByText("đẹp")).toBeTruthy();
    await rate(/^Good/); // đẹp: next step tomorrow, so it waits for another session
    expect(screen.getByText("ăn")).toBeTruthy();
    expect(screen.getByText("1 card left")).toBeTruthy();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe("1");
  });

  it("shows pronunciation and notes with the answer", () => {
    render(<StudySession queue={[card("a", "ăn")]} settings={DEFAULT_SRS_SETTINGS} onRate={rater(() => 0)} onFinish={() => {}} />);
    expect(screen.queryByText("a note")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Show Answer" }));
    expect(screen.getByText("/pro/")).toBeTruthy();
    expect(screen.getByText("a note")).toBeTruthy();
  });

  it("ignores rating keys while a dialog is open, and held-down keys", async () => {
    const onRate = rater(() => 24 * 60 * MIN);
    const queue = [card("a", "ăn")];
    const session = (dialog: boolean) => (
      <>
        <StudySession queue={queue} settings={DEFAULT_SRS_SETTINGS} onRate={onRate} onFinish={() => {}} />
        {dialog && <div role="dialog" aria-modal="true" />}
      </>
    );
    const { rerender } = render(session(true));
    fireEvent.keyDown(window, { key: " " });
    expect(screen.queryByText("ăn meaning")).toBeNull();
    rerender(session(false));
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByText("ăn meaning")).toBeTruthy();
    fireEvent.keyDown(window, { key: "3", repeat: true });
    expect(onRate).not.toHaveBeenCalled();
    await act(async () => fireEvent.keyDown(window, { key: "3" }));
    expect(onRate).toHaveBeenCalledTimes(1);
  });
});
