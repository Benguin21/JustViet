"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { GRAMMAR_ROUTES, hasGuide, hasLesson } from "@/lib/grammar/content";
import type { GrammarLesson } from "@/lib/grammar/curriculum";
import { TEACHERS } from "@/lib/lessons/teachers";
import { Lotus } from "./Lotus";

/**
 * What opens when a lesson is tapped: its title and its two parts, the interactive lesson with its
 * teacher and the quick grammar guide. Both are open to everyone; a part that isn't built yet
 * (content.ts) shows greyed out as "Coming soon".
 */
export function LessonCard({
  lesson,
  levelSize,
  finished,
  onClose,
}: {
  lesson: GrammarLesson;
  levelSize: number;
  /** Null while progress is still loading. */
  finished: boolean | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const teacher = TEACHERS[lesson.teacher];
  const lessonReady = hasLesson(lesson.id);
  const guideReady = hasGuide(lesson.id);

  return (
    <Modal title={lesson.title} onClose={onClose} maxWidth="md">
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <Lotus bloom={finished === true} size={44} />
          <div>
            <p className="text-sm font-extrabold tracking-wide text-ink-500 uppercase">
              {lesson.level.name} · Lesson {lesson.number} of {levelSize}
            </p>
            <p className="font-bold text-ink-700">
              {finished == null ? " " : finished ? "Finished: your lotus has bloomed." : "Not finished yet."}
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <Button disabled={!lessonReady} onClick={() => router.push(GRAMMAR_ROUTES.lesson(lesson.id))}>
            Lesson with {teacher.name}
          </Button>
          {!lessonReady ? <ComingSoon /> : null}
        </div>
        <div className="flex flex-col gap-2">
          <Button variant="outline" disabled={!guideReady} onClick={() => router.push(GRAMMAR_ROUTES.guide(lesson.id))}>
            Quick grammar guide
          </Button>
          {!guideReady ? <ComingSoon /> : null}
        </div>
      </div>
    </Modal>
  );
}

function ComingSoon() {
  return <p className="text-center text-xs font-extrabold tracking-wide text-yellow-600 uppercase">Coming soon</p>;
}
