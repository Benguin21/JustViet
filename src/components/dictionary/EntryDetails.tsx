import { Badge } from "@/components/ui/Badge";
import { partOfSpeechLabels } from "@/lib/dictionary/part-of-speech";
import type { DictionaryHeadword, DictionarySense } from "@/lib/dictionary/types";

/**
 * Splits a numbered Vietnamese definition ("1. … 2. …") into its parts so
 * each meaning reads as its own line. Unnumbered text comes back as-is.
 */
function splitNumbered(text: string): string[] {
  const parts = text.split(/\s*(?:^|\s)\d+\.\s+/).filter(Boolean);
  return parts.length > 1 ? parts : [text];
}

function PosBadges({ raw }: { raw?: string }) {
  const labels = partOfSpeechLabels(raw);
  if (!labels.length) return null;
  return (
    <>
      {labels.map((label) => (
        <Badge key={label} tone="gray">
          {label}
        </Badge>
      ))}
    </>
  );
}

function Sense({ sense, number }: { sense: DictionarySense; number?: number }) {
  const definitions = sense.definitionVi ? splitNumbered(sense.definitionVi) : [];
  return (
    <li className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline gap-2">
        {number !== undefined && (
          <span className="font-heading text-sm font-extrabold text-red-500">{number}.</span>
        )}
        <span className="text-lg font-bold text-ink-900">{sense.english}</span>
        <PosBadges raw={sense.partOfSpeech} />
      </div>
      {definitions.length > 0 && (
        <div className="text-ink-700">
          <p className="text-xs font-bold tracking-wide text-ink-500 uppercase">Định nghĩa</p>
          {definitions.length === 1 ? (
            <p lang="vi">{definitions[0]}</p>
          ) : (
            <ol className="list-decimal pl-5" lang="vi">
              {definitions.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ol>
          )}
        </div>
      )}
      {sense.examples.map((example) => (
        <div key={example.vi} className="rounded-xl bg-yellow-50 px-4 py-2">
          <p className="font-semibold text-ink-900" lang="vi">
            {example.vi}
          </p>
          {example.en && <p className="text-sm text-ink-500 italic">{example.en}</p>}
        </div>
      ))}
    </li>
  );
}

/**
 * Everything the dictionary knows about one headword: shared meanings
 * (with Vietnamese definitions and examples), then the user's own
 * meanings and notes. Presentational only — no data fetching, no actions —
 * so it can be reused anywhere a definition is shown (the Dictionary's
 * detail view today; a compact in-lesson lookup popup later).
 */
export function EntryDetails({ headword }: { headword: DictionaryHeadword }) {
  const { shared, personal } = headword;
  const sharedSenses = shared?.senses ?? [];
  const personalSenses = personal?.senses ?? [];
  const numbered = sharedSenses.length > 1;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          {shared?.level && <Badge tone="blue">{shared.level}</Badge>}
          {!shared && <Badge tone="yellow">My word</Badge>}
        </div>
        <h3 className="font-heading mt-2 text-4xl font-extrabold text-ink-900" lang="vi">
          {headword.headword}
        </h3>
      </div>

      {sharedSenses.length > 0 && (
        <ul className="flex flex-col gap-4">
          {sharedSenses.map((sense, i) => (
            <Sense key={`${sense.english}-${i}`} sense={sense} number={numbered ? i + 1 : undefined} />
          ))}
        </ul>
      )}

      {personalSenses.length > 0 && (
        <section className={shared ? "rounded-2xl border-2 border-dashed border-yellow-300 p-4" : ""}>
          {shared && (
            <h4 className="mb-3 text-sm font-bold tracking-wide text-yellow-600 uppercase">
              My meanings
            </h4>
          )}
          <ul className="flex flex-col gap-4">
            {personalSenses.map((sense, i) => (
              <Sense
                key={`${sense.english}-${i}`}
                sense={sense}
                number={personalSenses.length > 1 ? i + 1 : undefined}
              />
            ))}
          </ul>
        </section>
      )}

      {personal?.notes && (
        <div>
          <h4 className="text-xs font-bold tracking-wide text-ink-500 uppercase">My notes</h4>
          <p className="text-ink-700">{personal.notes}</p>
        </div>
      )}
    </div>
  );
}
