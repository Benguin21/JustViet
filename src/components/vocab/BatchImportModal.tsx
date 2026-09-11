"use client";

import { useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { PARTS_OF_SPEECH } from "@/lib/vocab/types";
import type { NewVocabCardInput, PartOfSpeech, VocabCard } from "@/lib/vocab/types";
import {
  IMPORT_PROBLEM_LABEL,
  buildImportPreview,
  parseImportText,
  toNewCardInput,
  type DelimiterOption,
  type ImportPreviewRow,
} from "@/lib/vocab/import";

const DELIMITER_OPTIONS: { value: DelimiterOption; label: string }[] = [
  { value: "auto", label: "Auto-detect" },
  { value: "tab", label: "Tab" },
  { value: "comma", label: "Comma" },
  { value: "semicolon", label: "Semicolon" },
  { value: "pipe", label: "Pipe (|)" },
];

const PLACEHOLDER = `eat\tăn\tverb\tTôi ăn cơm.\tfood
school\ttrường\tnoun\tTôi đi học.\teducation
beautiful\tđẹp\tadjective\tCô ấy rất đẹp.\tdescription`;

type BatchImportModalProps = {
  existingCards: VocabCard[];
  onClose: () => void;
  onImport: (inputs: NewVocabCardInput[]) => Promise<void>;
};

export function BatchImportModal({ existingCards, onClose, onImport }: BatchImportModalProps) {
  const [text, setText] = useState("");
  const [delimiterOption, setDelimiterOption] = useState<DelimiterOption>("auto");
  const [rows, setRows] = useState<ImportPreviewRow[]>([]);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successCount, setSuccessCount] = useState<number | null>(null);

  const detectedDelimiter = useMemo(() => parseImportText(text).delimiterUsed, [text]);

  function handleTextChange(next: string) {
    setText(next);
    setSuccessCount(null);
    setError(null);
    const parsed = parseImportText(next, delimiterOption);
    setRows(buildImportPreview(parsed.rows, existingCards));
  }

  function handleDelimiterChange(next: DelimiterOption) {
    setDelimiterOption(next);
    const parsed = parseImportText(text, next);
    setRows(buildImportPreview(parsed.rows, existingCards));
  }

  function updateRow(id: string, patch: Partial<ImportPreviewRow>) {
    setRows((prev) =>
      prev.map((row) => {
        if (row.id !== id) return row;
        const next = { ...row, ...patch };
        // Fixing a blank required field clears that specific complaint —
        // duplicate flags are left as-is; the checkbox handles those.
        const problems = next.problems.filter((p) => {
          if (p === "missing-english") return !next.english.trim();
          if (p === "missing-vietnamese") return !next.vietnamese.trim();
          return true;
        });
        const problemsChanged = problems.length !== next.problems.length;
        return {
          ...next,
          problems,
          included: problemsChanged && problems.length === 0 ? true : next.included,
        };
      }),
    );
  }

  function removeRow(id: string) {
    setRows((prev) => prev.filter((row) => row.id !== id));
  }

  const total = rows.length;
  const newCount = rows.filter((r) => r.problems.length === 0).length;
  const duplicateCount = rows.filter((r) => r.problems.some((p) => p.startsWith("duplicate"))).length;
  const invalidCount = rows.filter((r) => r.problems.some((p) => p.startsWith("missing"))).length;
  const includedCount = rows.filter((r) => r.included).length;

  async function handleImport() {
    setImporting(true);
    setError(null);
    try {
      const inputs = rows.filter((r) => r.included).map(toNewCardInput);
      await onImport(inputs);
      setSuccessCount(inputs.length);
      setText("");
      setRows([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Import Cards" onClose={onClose} maxWidth="2xl">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-ink-500">
          Copy a table from Excel or Google Sheets and paste it below. Minimum columns:{" "}
          <strong className="text-ink-700">English</strong> and{" "}
          <strong className="text-ink-700">Vietnamese</strong>. Part of speech, example sentence,
          tags, pronunciation, and notes are all optional.
        </p>

        <textarea
          value={text}
          onChange={(e) => handleTextChange(e.target.value)}
          placeholder={PLACEHOLDER}
          rows={6}
          className="w-full resize-y rounded-xl border-2 border-ink-300/60 bg-surface px-4 py-3 font-mono text-sm text-ink-900 placeholder:text-ink-300 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
        />

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <label htmlFor="import-delimiter" className="font-bold text-ink-500">
            Delimiter
          </label>
          <select
            id="import-delimiter"
            value={delimiterOption}
            onChange={(e) => handleDelimiterChange(e.target.value as DelimiterOption)}
            className="rounded-xl border-2 border-ink-300/60 bg-surface px-3 py-1.5 text-ink-900 focus:border-yellow-500 focus:ring-4 focus:ring-yellow-100 focus:outline-none"
          >
            {DELIMITER_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {delimiterOption === "auto" && total > 0 && (
            <span className="text-ink-300">
              (detected: {DELIMITER_OPTIONS.find((o) => o.value === detectedDelimiter)?.label})
            </span>
          )}
        </div>

        {successCount !== null && (
          <p className="rounded-xl bg-success/15 px-4 py-2 text-sm font-semibold text-success-dark">
            Imported {successCount} card{successCount === 1 ? "" : "s"}. Paste more below, or close
            when you&apos;re done.
          </p>
        )}
        {error && (
          <p className="rounded-xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600">
            {error}
          </p>
        )}

        {total > 0 && (
          <>
            <div className="flex flex-wrap items-center gap-2 text-sm font-bold">
              <span className="text-ink-900">{total} card{total === 1 ? "" : "s"} detected</span>
              <Badge tone="green">{newCount} new</Badge>
              {duplicateCount > 0 && <Badge tone="yellow">{duplicateCount} duplicate</Badge>}
              {invalidCount > 0 && <Badge tone="red">{invalidCount} invalid</Badge>}
            </div>

            <div className="max-h-80 overflow-auto rounded-xl border border-ink-300/30">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="sticky top-0 bg-paper text-xs font-bold tracking-wide text-ink-500 uppercase">
                  <tr>
                    <th className="px-3 py-2" />
                    <th className="px-3 py-2">Vietnamese</th>
                    <th className="px-3 py-2">English</th>
                    <th className="px-3 py-2">Part of Speech</th>
                    <th className="px-3 py-2">Tags</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t border-ink-300/20 ${
                        row.problems.length > 0 ? "bg-red-50/40" : ""
                      }`}
                    >
                      <td className="px-3 py-2">
                        <input
                          type="checkbox"
                          checked={row.included}
                          onChange={(e) => updateRow(row.id, { included: e.target.checked })}
                          aria-label={`Include row ${row.line}`}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <RowCell
                          value={row.vietnamese}
                          onChange={(v) => updateRow(row.id, { vietnamese: v })}
                          invalid={row.problems.includes("missing-vietnamese")}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <RowCell
                          value={row.english}
                          onChange={(v) => updateRow(row.id, { english: v })}
                          invalid={row.problems.includes("missing-english")}
                        />
                      </td>
                      <td className="px-3 py-2">
                        <select
                          value={row.partOfSpeech}
                          onChange={(e) =>
                            updateRow(row.id, { partOfSpeech: e.target.value as PartOfSpeech })
                          }
                          className="w-full rounded-lg border border-ink-300/40 bg-surface px-2 py-1 text-sm capitalize"
                        >
                          {PARTS_OF_SPEECH.map((pos) => (
                            <option key={pos} value={pos}>
                              {pos}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-3 py-2">
                        <RowCell
                          value={row.tags.join(", ")}
                          onChange={(v) =>
                            updateRow(row.id, {
                              tags: v.split(",").map((t) => t.trim()).filter(Boolean),
                            })
                          }
                        />
                      </td>
                      <td className="px-3 py-2">
                        {row.problems.length === 0 ? (
                          <Badge tone="green">Ready</Badge>
                        ) : (
                          <div className="flex flex-col gap-1">
                            {row.problems.map((p) => (
                              <Badge
                                key={p}
                                tone={p.startsWith("duplicate") ? "yellow" : "red"}
                              >
                                {IMPORT_PROBLEM_LABEL[p]}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => removeRow(row.id)}
                          aria-label={`Remove row ${row.line}`}
                          className="text-ink-300 hover:text-red-500"
                        >
                          ×
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} fullWidth={false} className="px-6">
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            loading={importing}
            disabled={includedCount === 0}
            fullWidth={false}
            className="px-8"
          >
            Import {includedCount} Card{includedCount === 1 ? "" : "s"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function RowCell({
  value,
  onChange,
  invalid,
}: {
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}) {
  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`w-full rounded-lg border bg-surface px-2 py-1 text-sm ${
        invalid ? "border-red-400" : "border-ink-300/40"
      }`}
    />
  );
}
