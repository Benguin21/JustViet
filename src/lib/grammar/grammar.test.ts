import { describe, expect, it } from "vitest";
import { avatarFor } from "@/lib/avatar/characters";
import { HATCH_XP } from "@/lib/companion/growth";
import { isSourceId } from "@/lib/xp/events";
import { buildCurriculum, CURRICULUM } from "./curriculum";
import { mapCurriculumRows, serializeCurriculum, type CurriculumEntry } from "./curriculum-import";
import file from "./curriculum.json";
import { isLessonId, suggestLessonId } from "./ids";
import { GRAMMAR_LEVELS, levelFromName } from "./levels";
import { layoutMap, MAP, sectionAt, stairTreads } from "./map-layout";
import { avatarIndex, countCompleted } from "./progress";
import { placeSprites } from "./scenery";
import { searchLessons } from "./search";

const HEADER = ["App Title", "Difficulty", "ID"];

describe("lesson IDs", () => {
  it("suggests a readable ID from a title: accents folded, leading article dropped", () => {
    expect(suggestLessonId("The Linking Verb Là")).toBe("linking-verb-la");
    expect(suggestLessonId("Đâu for Where")).toBe("dau-for-where");
    expect(suggestLessonId("Asking Someone's Name")).toBe("asking-someones-name");
    expect(suggestLessonId("Có ... Không Questions")).toBe("co-khong-questions");
  });

  it("adds a number when the ID is taken", () => {
    expect(suggestLessonId("Ending Đây", new Set(["ending-day"]))).toBe("ending-day-2");
    expect(suggestLessonId("Ending Đây", new Set(["ending-day", "ending-day-2"]))).toBe("ending-day-3");
  });

  it("accepts only lowercase letters, digits and single hyphens", () => {
    expect(isLessonId("linking-verb-la")).toBe(true);
    for (const bad of ["Linking", "two--hyphens", "-lead", "trail-", "with space", "là", "", "x".repeat(61)]) {
      expect(isLessonId(bad)).toBe(false);
    }
  });
});

describe("grammar levels", () => {
  it("reads the spreadsheet's difficulty names", () => {
    expect(levelFromName("Beginner I")?.id).toBe("beginner-1");
    expect(levelFromName(" intermediate  iii ")?.id).toBe("intermediate-3");
    expect(levelFromName("Advanced 2")?.id).toBe("advanced-2");
    expect(levelFromName("Master")?.id).toBe("master");
    expect(levelFromName("Expert")).toBeNull();
  });

  it("climbs from the lotus lake to the chùa", () => {
    expect(GRAMMAR_LEVELS.map((l) => l.scene)).toEqual([
      "lake", "lake", "paddy", "fields", "fields", "terraces", "terraces", "mountains", "stairs", "chua",
    ]);
  });
});

describe("curriculum import", () => {
  it("maps columns by header, in any order, and keeps row order within each level", () => {
    const r = mapCurriculumRows([
      ["ID", "Notes", "Difficulty", "App Title"],
      ["b", "", "Beginner II", "B lesson"],
      ["a", "", "Beginner I", "A lesson"],
      ["", "", "", ""],
      ["c", "x", "Beginner II", "C lesson"],
    ]);
    expect(r.errors).toEqual([]);
    expect(r.ignoredHeaders).toEqual(["Notes"]);
    expect(r.lessons.map((l) => l.id)).toEqual(["a", "b", "c"]);
  });

  it("refuses missing, malformed and repeated IDs, suggesting one for a missing ID", () => {
    const r = mapCurriculumRows([
      HEADER,
      ["The Six Tones", "Beginner I", ""],
      ["Bad", "Beginner I", "Bad ID"],
      ["One", "Beginner I", "one"],
      ["Two", "Beginner I", "one"],
      ["Three", "Expert", "three"],
    ]);
    expect(r.errors.map((e) => e.row)).toEqual([2, 3, 5, 6]);
    expect(r.errors[0].message).toContain("Suggested: six-tones");
    expect(r.errors[2].message).toContain("already used on row 4");
    expect(r.errors[3].message).toContain('Unknown difficulty "Expert"');
  });

  it("needs title, difficulty and ID columns", () => {
    expect(mapCurriculumRows([["Title", "Difficulty"]]).errors[0].message).toContain("No ID column");
  });

  it("gives new lessons alternating teachers, starting with Cô Tươi", () => {
    const r = mapCurriculumRows([HEADER, ["A", "Beginner I", "a"], ["B", "Beginner I", "b"], ["C", "Beginner I", "c"]]);
    expect(r.lessons.map((l) => l.teacher)).toEqual(["tuoi", "vinh", "tuoi"]);
  });

  it("keeps every lesson's teacher when a lesson is inserted before it", () => {
    const previous: CurriculumEntry[] = [
      { id: "a", title: "A", level: "beginner-1", teacher: "tuoi" },
      { id: "b", title: "B", level: "beginner-1", teacher: "vinh" },
      { id: "c", title: "C", level: "beginner-1", teacher: "tuoi" },
    ];
    const r = mapCurriculumRows(
      [HEADER, ["A", "Beginner I", "a"], ["New", "Beginner I", "new"], ["B", "Beginner I", "b"], ["C", "Beginner I", "c"]],
      previous,
    );
    expect(r.lessons.map((l) => [l.id, l.teacher])).toEqual([
      ["a", "tuoi"],
      ["new", "vinh"],
      ["b", "vinh"],
      ["c", "tuoi"],
    ]);
  });

  it("lets a Teacher column pin a lesson's teacher", () => {
    const r = mapCurriculumRows([
      [...HEADER, "Teacher"],
      ["A", "Beginner I", "a", "Thầy Vinh"],
      ["B", "Beginner I", "b", ""],
      ["C", "Beginner I", "c", "Mr Smith"],
    ]);
    expect(r.errors.map((e) => e.row)).toEqual([4]);
    expect(r.lessons.map((l) => l.teacher)).toEqual(["vinh", "tuoi"]);
  });

  it("writes one lesson per line, as valid JSON", () => {
    const lessons: CurriculumEntry[] = [{ id: "a", title: "A \"quoted\"", level: "master", teacher: "tuoi" }];
    const text = serializeCurriculum({ version: 1, source: "x.xlsx", lessons });
    expect(text.split("\n")).toHaveLength(4);
    expect(JSON.parse(text).lessons).toEqual(lessons);
  });
});

describe("the shipped curriculum", () => {
  const entries = file.lessons as CurriculumEntry[];

  it("has a valid, unique, ledger-safe ID for every lesson", () => {
    const ids = entries.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) {
      expect(isLessonId(id)).toBe(true);
      expect(isSourceId(`grammar-new_${id}`)).toBe(true);
    }
  });

  it("lists lessons by level, easiest first, with a lesson in every level", () => {
    const order = entries.map((e) => GRAMMAR_LEVELS.findIndex((l) => l.id === e.level));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect(order).toEqual([...order].sort((a, b) => a - b));
    expect(CURRICULUM.byLevel.every((g) => g.lessons.length > 0)).toBe(true);
    expect(CURRICULUM.lessons).toHaveLength(entries.length);
  });
});

describe("buildCurriculum", () => {
  it("numbers lessons along the path and within their level", () => {
    const c = buildCurriculum([
      { id: "a", title: "A", level: "beginner-1", teacher: "tuoi" },
      { id: "b", title: "B", level: "beginner-2", teacher: "vinh" },
      { id: "c", title: "C", level: "beginner-2", teacher: "tuoi" },
    ]);
    expect(c.lessons.map((l) => [l.id, l.order, l.number])).toEqual([
      ["a", 1, 1],
      ["b", 2, 1],
      ["c", 3, 2],
    ]);
    expect(c.byId.get("c")?.level.name).toBe("Beginner II");
    expect(c.byLevel[2].lessons).toEqual([]);
  });
});

describe("directory search", () => {
  const c = buildCurriculum([
    { id: "khong", title: "Không for Not", level: "beginner-1", teacher: "tuoi" },
    { id: "co-khong", title: "Có ... Không Questions", level: "beginner-2", teacher: "vinh" },
    { id: "cua", title: "Của for Possession", level: "beginner-2", teacher: "tuoi" },
    { id: "hon", title: "Comparisons With Hơn", level: "intermediate-1", teacher: "vinh" },
  ]);

  it("ignores accents and needs every word", () => {
    expect(searchLessons(c.lessons, "co khong").map((l) => l.id)).toEqual(["co-khong"]);
    expect(searchLessons(c.lessons, "của").map((l) => l.id)).toEqual(["cua"]);
    expect(searchLessons(c.lessons, "cua").map((l) => l.id)).toEqual(["cua"]);
  });

  it("puts titles that start with the query first, then course order", () => {
    expect(searchLessons(c.lessons, "khong").map((l) => l.id)).toEqual(["khong", "co-khong"]);
  });

  it("matches level names and word starts", () => {
    expect(searchLessons(c.lessons, "intermediate").map((l) => l.id)).toEqual(["hon"]);
    expect(searchLessons(c.lessons, "poss").map((l) => l.id)).toEqual(["cua"]);
    expect(searchLessons(c.lessons, "  ")).toHaveLength(4);
  });
});

describe("where the avatar stands", () => {
  const c = buildCurriculum(
    ["a", "b", "c", "d"].map((id) => ({ id, title: id, level: "beginner-1", teacher: "tuoi" as const })),
  );

  it("starts on the first lesson and stands after the furthest finished one", () => {
    expect(avatarIndex(c.lessons, new Set())).toBe(0);
    expect(avatarIndex(c.lessons, new Set(["a", "b"]))).toBe(2);
    expect(avatarIndex(c.lessons, new Set(["a", "c"]))).toBe(3);
    expect(avatarIndex(c.lessons, new Set(["a", "b", "c", "d"]))).toBe(3);
    expect(countCompleted(c.lessons, new Set(["a", "c", "zzz"]))).toBe(2);
  });

  it("isn't pulled back by a lesson inserted behind it", () => {
    const later = buildCurriculum(
      ["a", "new", "b", "c", "d"].map((id) => ({ id, title: id, level: "beginner-1", teacher: "tuoi" as const })),
    );
    expect(later.lessons[avatarIndex(later.lessons, new Set(["a", "b"]))].id).toBe("c");
  });
});

describe("map layout", () => {
  const sizes = [3, 5, 2];
  const layout = layoutMap(sizes);

  it("places every lesson inside its level's section, climbing from the bottom", () => {
    expect(layout.nodes).toHaveLength(10);
    let k = 0;
    sizes.forEach((n, level) => {
      const s = layout.sections[level];
      for (let j = 0; j < n; j++, k++) {
        const p = layout.nodes[k];
        expect(p.y).toBeGreaterThan(s.top);
        expect(p.y).toBeLessThan(s.top + s.height);
        expect(sectionAt(layout, p.y)).toBe(level);
        if (k > 0) expect(p.y).toBeLessThan(layout.nodes[k - 1].y);
        expect(p.x).toBeGreaterThanOrEqual(MAP.columnWidth / 2 - MAP.swing);
        expect(p.x).toBeLessThanOrEqual(MAP.columnWidth / 2 + MAP.swing);
      }
    });
  });

  it("stacks the sections without gaps, top level first, and ends at the centre under the chùa", () => {
    expect(layout.sections[2].top).toBe(0);
    for (let i = 0; i < sizes.length - 1; i++) {
      expect(layout.sections[i + 1].top + layout.sections[i + 1].height).toBe(layout.sections[i].top);
    }
    expect(layout.sections[0].top + layout.sections[0].height).toBe(layout.height);
    expect(layout.nodes[9].x).toBe(MAP.columnWidth / 2);
  });

  it("keeps the stone steps clear of the lesson circles", () => {
    const treads = stairTreads(layout.nodes, 8);
    expect(treads.length).toBeGreaterThan(0);
    for (const t of treads) {
      for (const p of layout.nodes) expect(Math.hypot(t.x - p.x, t.y - p.y)).toBeGreaterThan(25);
    }
  });
});

describe("scenery", () => {
  it("scatters the same drawings every time, beside the path", () => {
    const a = placeSprites("lake", 0, 3000);
    expect(placeSprites("lake", 0, 3000)).toEqual(a);
    expect(a.length).toBeGreaterThan(20);
    for (const s of a) {
      expect(s.y).toBeGreaterThanOrEqual(0);
      expect(s.y).toBeLessThan(3000);
      expect(s.xPct < 30 || s.xPct > 60).toBe(true);
    }
  });
});

describe("avatar", () => {
  it("is Rồng Con's egg until Level 5, then the hatched dragon", () => {
    expect(avatarFor(0)).toMatchObject({ character: "rong-con", form: 0, hatch: "egg" });
    expect(avatarFor(HATCH_XP)).toMatchObject({ form: 1, formName: "Baby Dragon", fullBody: false });
  });
});
