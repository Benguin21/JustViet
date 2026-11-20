import "@testing-library/jest-dom/vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCurriculum } from "@/lib/grammar/curriculum";
import { GrammarDirectory } from "./GrammarDirectory";
import { LessonCard } from "./LessonCard";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

afterEach(cleanup);

const curriculum = buildCurriculum([
  { id: "la", title: "The Linking Verb Là", level: "beginner-1", teacher: "tuoi" },
  { id: "khong", title: "Không for Not", level: "beginner-1", teacher: "vinh" },
  { id: "cua", title: "Của for Possession", level: "beginner-2", teacher: "tuoi" },
]);

describe("grammar directory", () => {
  it("lists every lesson by level, with how many have bloomed", () => {
    render(<GrammarDirectory curriculum={curriculum} completed={new Set(["la"])} onPick={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByRole("heading", { name: /^Beginner I,\s*1 of 2$/ })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: /^Beginner II,\s*0 of 1$/ })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: /Master/ })).toBeNull();
    expect(screen.getAllByRole("button", { name: /Linking Verb|Không|Của/ })).toHaveLength(3);
    expect(screen.getByRole("button", { name: /^The Linking Verb Là,?\s*finished$/ })).toBeInTheDocument();
  });

  it("searches without accents and opens the lesson picked", () => {
    const onPick = vi.fn();
    render(<GrammarDirectory curriculum={curriculum} completed={null} onPick={onPick} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox", { name: "Search grammar" }), { target: { value: "cua" } });
    expect(screen.getByText("1 lesson")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Của for Possession/ }));
    expect(onPick).toHaveBeenCalledWith(curriculum.byId.get("cua"));
  });

  it("says when nothing matches", () => {
    render(<GrammarDirectory curriculum={curriculum} completed={null} onPick={vi.fn()} onClose={vi.fn()} />);
    fireEvent.change(screen.getByRole("searchbox"), { target: { value: "zzz" } });
    expect(screen.getByText(/No grammar matches/)).toBeInTheDocument();
  });
});

describe("lesson card", () => {
  it("shows the title, its teacher, and both parts greyed out until they're built", () => {
    render(<LessonCard lesson={curriculum.byId.get("khong")!} levelSize={2} finished={false} onClose={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: "Không for Not" })).toBeInTheDocument();
    expect(screen.getByText(/Lesson 2 of 2/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Lesson with Thầy Vinh" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Quick grammar guide" })).toBeDisabled();
    expect(screen.getAllByText("Coming soon")).toHaveLength(2);
  });
});
