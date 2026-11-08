import { describe, expect, it } from "vitest";
import { TEACHERS, teacherForLesson } from "./teachers";

describe("teacherForLesson", () => {
  it("takes turns by whole lesson, starting with Cô Tươi", () => {
    expect([1, 2, 3, 4, 5].map((order) => teacherForLesson({ order }))).toEqual(["tuoi", "vinh", "tuoi", "vinh", "tuoi"]);
  });

  it("gives a lesson the same teacher every time it is opened or resumed", () => {
    const lesson = { order: 7 };
    expect(new Set(Array.from({ length: 5 }, () => teacherForLesson(lesson)))).toEqual(new Set(["tuoi"]));
  });

  it("keeps a pinned teacher", () => {
    expect(teacherForLesson({ order: 1, teacher: "vinh" })).toBe("vinh");
  });

  it("refuses an order that isn't a lesson position", () => {
    expect(() => teacherForLesson({ order: 0 })).toThrow(RangeError);
    expect(() => teacherForLesson({ order: 1.5 })).toThrow(RangeError);
  });

  it("introduces both as Vietnamese teachers with equal roles", () => {
    expect(TEACHERS.tuoi.role).toBe(TEACHERS.vinh.role);
  });
});
