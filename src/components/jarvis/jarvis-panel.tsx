"use client";

import { useCallback, useMemo, useState } from "react";
import type { PersonId, PersonProfile } from "@/lib/types";
import type { JarvisResponse } from "@/lib/jarvis/types";
import { JARVIS_SUGGESTIONS } from "@/lib/jarvis/intents";
import { askJarvis } from "@/lib/jarvis/ask";
import { MorningNav } from "@/components/shared/morning-nav";
import { useAppData } from "@/components/providers/data-provider";
import { cn } from "@/lib/utils";

const PERSON_CHIPS: { id: PersonId; label: string }[] = [
  { id: "levi", label: "Levi" },
  { id: "birgit", label: "Birgit" },
  { id: "heidi", label: "Heidi" },
];

export function JarvisPanel({
  initialPersonId = "levi",
}: {
  initialPersonId?: PersonId;
}) {
  const { data } = useAppData();
  const [personId, setPersonId] = useState<PersonId>(initialPersonId);
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<JarvisResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const person: PersonProfile | undefined = useMemo(
    () => data.persons.find((p) => p.id === personId),
    [data.persons, personId],
  );

  const ask = useCallback(
    async (raw: string) => {
      const q = raw.trim();
      setQuestion(q);
      setError(null);
      if (!person) {
        setError("Person nicht gefunden.");
        return;
      }

      // Instant local draft (offline-safe), then optional server AI polish.
      const local = askJarvis(personId, q, new Date(), {
        person,
        data,
      });
      setResult(local);
      setLoading(true);

      try {
        const res = await fetch("/api/jarvis/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            personId,
            question: q,
            nowIso: new Date().toISOString(),
            person,
          }),
        });
        const json = (await res.json()) as JarvisResponse & {
          ok?: boolean;
          error?: string;
        };
        if (!res.ok || json.ok === false) {
          // Keep deterministic local answer — never crash.
          setError(json.error ?? null);
          return;
        }
        setResult(json);
      } catch {
        setError(null);
        // offline: local answer already shown
      } finally {
        setLoading(false);
      }
    },
    [person, personId, data],
  );

  return (
    <div className="morning-shell mx-auto flex w-full max-w-3xl flex-col gap-6 px-5 py-5 sm:gap-8 sm:px-8 sm:py-8 landscape-tablet:gap-5 landscape-tablet:py-5">
      <MorningNav />

      <header className="space-y-2">
        <p className="text-sm tracking-[0.16em] text-[color:var(--quiet)] uppercase">
          Assistenz
        </p>
        <h1 className="font-display text-4xl tracking-tight sm:text-5xl">
          Jarvis
        </h1>
        <p className="text-lg text-[color:var(--quiet)] sm:text-xl">
          Was möchtest du wissen?
        </p>
      </header>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Person">
        {PERSON_CHIPS.map((chip) => {
          const active = chip.id === personId;
          return (
            <button
              key={chip.id}
              type="button"
              onClick={() => {
                setPersonId(chip.id);
                setResult(null);
              }}
              className={cn(
                "min-h-12 rounded-2xl px-5 text-base font-medium transition-[transform,background-color] duration-150 active:scale-[0.97]",
                active
                  ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                  : "bg-[color:var(--surface)] text-[color:var(--ink)] hover:bg-[color:var(--surface-strong)]",
              )}
            >
              {chip.label}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-2">
        {JARVIS_SUGGESTIONS.slice(0, 4).map((suggestion) => (
          <button
            key={suggestion}
            type="button"
            onClick={() => void ask(suggestion)}
            className="min-h-12 rounded-2xl bg-[color:var(--surface)] px-4 text-left text-base text-[color:var(--ink)] transition-[transform,background-color] duration-150 hover:bg-[color:var(--surface-strong)] active:scale-[0.97]"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <form
        className="flex flex-col gap-3 sm:flex-row"
        onSubmit={(e) => {
          e.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="jarvis-question">
          Frage
        </label>
        <input
          id="jarvis-question"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          placeholder="z. B. Was steht heute an?"
          className="min-h-14 flex-1 rounded-2xl border-0 bg-[color:var(--surface)] px-5 text-lg text-[color:var(--ink)] outline-none ring-0 placeholder:text-[color:var(--quiet)] focus-visible:ring-2 focus-visible:ring-[color:var(--brand)]"
          autoComplete="off"
        />
        <button
          type="submit"
          disabled={loading}
          className="min-h-14 rounded-2xl bg-[color:var(--ink)] px-8 text-lg text-[color:var(--surface)] transition-[opacity,transform] duration-150 hover:opacity-90 active:scale-[0.97] disabled:opacity-60"
        >
          {loading ? "…" : "Fragen"}
        </button>
      </form>

      <section
        aria-live="polite"
        className="min-h-40 rounded-[1.75rem] bg-[color:var(--surface)] px-6 py-6 sm:px-8 sm:py-8"
      >
        {result ? (
          <div className="space-y-3">
            <p className="text-sm tracking-[0.12em] text-[color:var(--quiet)] uppercase">
              Antwort · {person?.name ?? personId}
              {result.source === "ai" ? " · formuliert" : ""}
            </p>
            <p className="font-display text-2xl leading-snug tracking-tight sm:text-3xl">
              {result.answer}
            </p>
          </div>
        ) : (
          <p className="text-lg text-[color:var(--quiet)]">
            Tippe eine Frage oder wähle einen Vorschlag.
          </p>
        )}
        {error ? (
          <p className="mt-4 text-sm text-[color:var(--quiet)]">{error}</p>
        ) : null}
      </section>
    </div>
  );
}
