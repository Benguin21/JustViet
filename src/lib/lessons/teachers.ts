/**
 * JustViet's two Vietnamese teachers, and which of them teaches a lesson.
 *
 * Cô Tươi and Thầy Vinh are equal, full Vietnamese teachers: either can teach any lesson
 * (vocabulary, grammar or skills), explain, guide the exercises, encourage and correct. They
 * differ only in personality and look, never in level or authority. Cô Tươi (pastel yellow
 * áo dài) is warm, friendly, patient and encouraging, with expressive gestures. Thầy Vinh
 * (collared shirt, trousers, glasses) is calm, friendly, knowledgeable and approachable, with
 * clear explanations.
 *
 * They take turns by whole lesson, never by line or screen: lesson 1 of a course is Cô Tươi's,
 * lesson 2 Thầy Vinh's, lesson 3 Cô Tươi's, and so on. One teacher stays with a lesson from its
 * first screen to its last, through its exercises and feedback, and reopening or resuming it
 * brings back the same teacher, because the choice depends only on the lesson itself. Lesson
 * content never names its teacher: the lesson engine asks `teacherForLesson` and shows that
 * teacher's portrait, expressions and voice lines around the same content.
 */
export type TeacherId = "tuoi" | "vinh";
export type Expression = "neutral" | "welcome" | "explain" | "encourage";

export interface Teacher {
  id: TeacherId;
  name: string;
  role: string;
  /** Card background and name ink, as the guide card shows them. */
  tint: string;
  ink: string;
  /**
   * How the teacher delivers the same lesson: short lines a lesson screen can use around its
   * own content. Personality lives here, never in the lesson content.
   */
  voice: { start: string; correct: string; tryAgain: string; finish: string };
}

export const TEACHERS: Record<TeacherId, Teacher> = {
  tuoi: {
    id: "tuoi",
    name: "Cô Tươi",
    role: "Your Vietnamese teacher",
    tint: "#fdf0cf",
    ink: "#8a5a12",
    voice: {
      start: "Xin chào! Let’s learn together!",
      correct: "Giỏi quá! Wonderful!",
      tryAgain: "Không sao! Let’s try that once more.",
      finish: "You did it! I’m so proud of you!",
    },
  },
  vinh: {
    id: "vinh",
    name: "Thầy Vinh",
    role: "Your Vietnamese teacher",
    tint: "#e6f2ea",
    ink: "#2f6b55",
    voice: {
      start: "Xin chào! Let’s get started.",
      correct: "Đúng rồi! Well done.",
      tryAgain: "Almost! Let’s look at it again.",
      finish: "Lesson complete. Nice steady work!",
    },
  },
};

/** The order teachers take turns in: the first lesson of a course is Cô Tươi's. */
export const TEACHER_ROTATION: readonly TeacherId[] = ["tuoi", "vinh"];

/** What a lesson needs to have a teacher: where it sits in its course, or a pinned teacher. */
export interface LessonRef {
  /** The lesson's place in its course's fixed order, starting at 1. */
  order: number;
  /**
   * Pin a teacher instead of taking turns, e.g. to keep a lesson's teacher after the course is
   * reordered. Rarely needed.
   */
  teacher?: TeacherId;
}

/** Which teacher teaches this lesson, start to finish. Same lesson in, same teacher out. */
export function teacherForLesson(lesson: LessonRef): TeacherId {
  if (lesson.teacher) return lesson.teacher;
  if (!Number.isInteger(lesson.order) || lesson.order < 1) {
    throw new RangeError(`Lesson order must be a whole number from 1, got ${lesson.order}`);
  }
  return TEACHER_ROTATION[(lesson.order - 1) % TEACHER_ROTATION.length];
}
