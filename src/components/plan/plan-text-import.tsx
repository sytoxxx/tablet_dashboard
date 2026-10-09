"use client";

import { useRef, useState } from "react";
import { Check, ClipboardCopy } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PersonId } from "@/lib/types";
import type { PlanAnalysisResult } from "@/lib/plan-analysis/types";
import {
  buildAnalysisFromText,
  parseWorkPlanText,
  type KnownPerson,
  type TextImportOutcome,
} from "@/lib/plan-analysis/text-import";
import { CHATGPT_INSTRUCTION, TEXT_IMPORT_EXAMPLE } from "@/lib/plan-analysis/text-import-prompt";
import { cn } from "@/lib/utils";

type Answers = { year?: number; month?: number; person?: PersonId };

const MONTH_NAMES = [
  "Januar", "Februar", "März", "April", "Mai", "Juni",
  "Juli", "August", "September", "Oktober", "November", "Dezember",
];

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const el = document.createElement("textarea");
      el.value = text;
      el.setAttribute("readonly", "");
      el.style.position = "fixed";
      el.style.opacity = "0";
      document.body.appendChild(el);
      el.select();
      const ok = document.execCommand("copy");
      document.body.removeChild(el);
      return ok;
    } catch {
      return false;
    }
  }
}

function replaceLine(text: string, lineNo: number, replacement: string | null): string {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  if (replacement === null) lines.splice(lineNo - 1, 1);
  else lines[lineNo - 1] = replacement;
  return lines.join("\n");
}

const chip = (active: boolean) =>
  cn(
    "min-h-12 rounded-2xl px-5 text-base transition-transform active:scale-[0.97]",
    active ? "bg-[color:var(--ink)] text-[color:var(--surface)]" : "bg-[color:var(--surface)]",
  );

/**
 * "Mit ChatGPT importieren": a big text box, a checker, and — only when something is unclear —
 * short, concrete questions. Never saves anything itself; hands a normal `PlanAnalysisResult` to
 * the shared preview/save flow.
 */
export function PlanTextImport({
  persons,
  chosenPersonId,
  text,
  onTextChange,
  onReady,
}: {
  /** Persons that can have a work plan (not Levi). */
  persons: KnownPerson[];
  /** Person picked in the chips above — null while nobody has been picked yet. */
  chosenPersonId: PersonId | null;
  text: string;
  onTextChange: (text: string) => void;
  onReady: (result: PlanAnalysisResult, personId: PersonId) => void;
}) {
  const [outcome, setOutcome] = useState<TextImportOutcome | null>(null);
  const [answers, setAnswers] = useState<Answers>({});
  const [copied, setCopied] = useState<"ok" | "fail" | null>(null);
  const [fixes, setFixes] = useState<Record<number, string>>({});
  const [empty, setEmpty] = useState(false);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const resolvePerson = (o: TextImportOutcome, ans: Answers): { id: PersonId | null; question: string | null } => {
    if (ans.person) return { id: ans.person, question: null };
    if (o.personId && (!chosenPersonId || chosenPersonId === o.personId)) return { id: o.personId, question: null };
    if (o.personId && chosenPersonId && chosenPersonId !== o.personId) {
      const a = persons.find((p) => p.id === o.personId)?.name ?? o.personId;
      const b = persons.find((p) => p.id === chosenPersonId)?.name ?? chosenPersonId;
      return { id: null, question: `Im Text steht „${a}“, oben hast du „${b}“ gewählt. Für wen ist der Plan?` };
    }
    if (o.personText && o.personProblem) {
      return {
        id: null,
        question:
          o.personProblem === "ambiguous"
            ? `„${o.personText}“ passt zu mehreren Personen. Für wen ist der Plan?`
            : `Die Person „${o.personText}“ kenne ich nicht. Für wen ist der Plan?`,
      };
    }
    if (chosenPersonId) return { id: chosenPersonId, question: null };
    return { id: null, question: "Im Text steht keine Person. Für wen ist der Plan?" };
  };

  const run = (nextText: string = text, nextAnswers: Answers = answers) => {
    setAnswers(nextAnswers);
    setFixes({});
    const o = parseWorkPlanText(nextText, {
      persons,
      assumeYear: nextAnswers.year,
      assumeMonth: nextAnswers.month,
    });
    setOutcome(o);
    setEmpty(false);
    if (o.issues.length > 0) return;
    if (o.entries.length === 0 && !o.needsYear && !o.needsMonth) {
      setEmpty(true);
      return;
    }
    if (o.needsYear || o.needsMonth) return;
    const { id, question } = resolvePerson(o, nextAnswers);
    if (!id || question) return;
    onReady(buildAnalysisFromText(o), id);
  };

  const personState = outcome ? resolvePerson(outcome, answers) : null;
  const blocking = outcome && outcome.issues.length > 0;
  const thisYear = new Date().getFullYear();

  return (
    <div className="space-y-6" data-testid="text-import">
      <section className="space-y-3 rounded-[1.5rem] bg-[color:var(--surface)] p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            variant="secondary"
            className="h-14 gap-2 rounded-2xl bg-white/70 px-5 text-base active:scale-[0.97]"
            onClick={async () => {
              const ok = await copyToClipboard(CHATGPT_INSTRUCTION);
              setCopied(ok ? "ok" : "fail");
              window.setTimeout(() => setCopied(null), 3500);
            }}
          >
            {copied === "ok" ? <Check className="size-5" aria-hidden /> : <ClipboardCopy className="size-5" aria-hidden />}
            ChatGPT-Anweisung kopieren
          </Button>
          <p className="min-w-0 flex-1 text-base leading-snug text-[color:var(--quiet)]">
            {copied === "ok" ? (
              <span role="status" className="font-medium text-[color:var(--ink)]">Kopiert — jetzt in ChatGPT einfügen, Plan-Foto dazu.</span>
            ) : copied === "fail" ? (
              <span role="alert" className="text-red-800">Kopieren hat nicht geklappt — Text unten markieren und selbst kopieren.</span>
            ) : (
              <>① In ChatGPT: Foto + Anweisung · ② Liste kopieren · ③ unten einfügen</>
            )}
          </p>
        </div>
        <details className="text-sm text-[color:var(--quiet)]" open={copied === "fail"}>
          <summary className="min-h-10 cursor-pointer py-2">Anweisung ansehen</summary>
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-2xl bg-white/70 p-4 text-sm leading-relaxed text-[color:var(--ink)] select-all">
            {CHATGPT_INSTRUCTION}
          </pre>
        </details>
      </section>

      <section className="space-y-3">
        <label htmlFor="plan-text" className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
          Liste von ChatGPT
        </label>
        <textarea
          id="plan-text"
          ref={areaRef}
          value={text}
          onChange={(e) => {
            onTextChange(e.target.value);
            setOutcome(null);
            setEmpty(false);
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
          placeholder={TEXT_IMPORT_EXAMPLE}
          className="min-h-[40vh] w-full resize-y rounded-[1.5rem] bg-[color:var(--surface)] p-5 text-lg leading-relaxed tabular-nums outline-none placeholder:text-[color:var(--quiet)]/60 focus:ring-2 focus:ring-[color:var(--brand)]"
        />
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            size="lg"
            className="h-16 rounded-2xl px-8 text-lg active:scale-[0.97]"
            disabled={!text.trim()}
            onClick={() => run()}
          >
            Arbeitsplan überprüfen
          </Button>
          {text ? (
            <Button
              type="button"
              variant="ghost"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={() => {
                onTextChange("");
                setOutcome(null);
                setAnswers({});
                setEmpty(false);
              }}
            >
              Feld leeren
            </Button>
          ) : null}
        </div>
      </section>

      {empty ? (
        <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-lg text-red-800">
          In diesem Text habe ich keinen einzigen Tag gefunden. Jede Zeile beginnt mit einem Datum, zum
          Beispiel „01.10.2026 | 06:00-12:00“.
        </p>
      ) : null}

      {blocking ? (
        <section className="space-y-4 rounded-[1.5rem] border border-amber-500/30 bg-amber-50/60 p-5" data-testid="text-issues">
          <div>
            <h3 className="font-display text-2xl tracking-tight text-amber-950">
              {outcome!.issues.length === 1 ? "Eine Zeile verstehe ich nicht" : `${outcome!.issues.length} Zeilen verstehe ich nicht`}
            </h3>
            <p className="mt-1 text-base text-amber-900/80">
              Ich rate nichts. Bitte die Zeile hier korrigieren oder entfernen — dann prüfe ich noch einmal.
            </p>
          </div>
          <ul className="space-y-4">
            {outcome!.issues.map((issue) => {
              const value = fixes[issue.line] ?? issue.text;
              return (
                <li key={`${issue.line}-${issue.text}`} className="space-y-2 rounded-2xl bg-white/80 p-4">
                  <p className="text-sm font-medium text-amber-900">
                    Zeile {issue.line}: {issue.reason}
                  </p>
                  <input
                    value={value}
                    onChange={(e) => setFixes((f) => ({ ...f, [issue.line]: e.target.value }))}
                    aria-label={`Zeile ${issue.line} korrigieren`}
                    className="h-12 w-full rounded-xl bg-[color:var(--surface)] px-4 text-base tabular-nums outline-none focus:ring-2 focus:ring-[color:var(--brand)]"
                  />
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      className="h-12 rounded-xl px-5"
                      onClick={() => {
                        const next = replaceLine(text, issue.line, value);
                        onTextChange(next);
                        run(next);
                      }}
                    >
                      Zeile übernehmen
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-12 rounded-xl px-5"
                      onClick={() => {
                        const next = replaceLine(text, issue.line, null);
                        onTextChange(next);
                        run(next);
                      }}
                    >
                      Zeile entfernen
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {outcome && !blocking && (outcome.needsYear || outcome.needsMonth) ? (
        <section className="space-y-3 rounded-[1.5rem] border border-amber-500/30 bg-amber-50/60 p-5" data-testid="text-question-period">
          {outcome.needsMonth ? (
            <>
              <p className="text-lg font-medium text-amber-950">
                In der Liste stehen nur Tagesnummern. Für welchen Monat gilt der Plan?
              </p>
              <div className="flex flex-wrap gap-2">
                {MONTH_NAMES.map((name, i) => (
                  <button
                    key={name}
                    type="button"
                    className={chip(answers.month === i + 1)}
                    onClick={() => run(text, { ...answers, month: i + 1 })}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </>
          ) : null}
          {outcome.needsYear && !outcome.needsMonth ? (
            <>
              <p className="text-lg font-medium text-amber-950">
                In der Liste steht kein Jahr. Für welches Jahr gilt der Plan?
              </p>
              <div className="flex flex-wrap gap-2">
                {[thisYear - 1, thisYear, thisYear + 1].map((y) => (
                  <button key={y} type="button" className={chip(answers.year === y)} onClick={() => run(text, { ...answers, year: y })}>
                    {y}
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {outcome && !blocking && !outcome.needsYear && !outcome.needsMonth && outcome.entries.length > 0 && personState?.question ? (
        <section className="space-y-3 rounded-[1.5rem] border border-amber-500/30 bg-amber-50/60 p-5" data-testid="text-question-person">
          <p className="text-lg font-medium text-amber-950">{personState.question}</p>
          <div className="flex flex-wrap gap-2">
            {persons.map((p) => (
              <button key={p.id} type="button" className={chip(answers.person === p.id)} onClick={() => run(text, { ...answers, person: p.id })}>
                {p.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
