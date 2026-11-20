/**
 * Which lessons have their content built yet. Each lesson has two parts, both open to everyone
 * from the start: the interactive lesson with its teacher, and the quick grammar guide (a short
 * textbook-style explanation to look back on, ending in a "Đi lớp" button to the lesson). Until a
 * part is built, the lesson card shows its button greyed out as "Coming soon".
 *
 * To launch a part, add the lesson's ID here as it's built, e.g.
 *   "linking-verb-la": { guide: true },
 * along with the route that shows it (see GRAMMAR_ROUTES).
 */
export interface LessonContent {
  lesson?: boolean;
  guide?: boolean;
}

export const GRAMMAR_CONTENT: Readonly<Record<string, LessonContent>> = {};

export const hasLesson = (id: string) => GRAMMAR_CONTENT[id]?.lesson === true;
export const hasGuide = (id: string) => GRAMMAR_CONTENT[id]?.guide === true;

/**
 * Where each part will live. Query parameters, not [id] segments, because the app is a static
 * export (like the Community's pages). Not built yet.
 */
export const GRAMMAR_ROUTES = {
  lesson: (id: string) => `/grammar/lesson?id=${encodeURIComponent(id)}`,
  guide: (id: string) => `/grammar/guide?id=${encodeURIComponent(id)}`,
};
