"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { completionFor } from "@/lib/coffee/guide/flow";
import { brewMethodFor, brewNoteFor } from "@/lib/coffee/guide/history";
import type { WdtChoice } from "@/lib/coffee/guide/session";
import type { GuideSelection } from "@/lib/coffee/guide/types";
import { getActivePersonId } from "@/lib/profile/active-person";
import type { PersonId } from "@/lib/types";
import { cn } from "@/lib/utils";

const chip = (active: boolean) =>
  cn(
    "min-h-14 rounded-2xl px-5 text-lg font-medium transition-transform active:scale-[0.97]",
    active
      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
      : "bg-[color:var(--surface)]",
  );

export function CompletionView({
  selection,
  wdt,
  onRestart,
  onBack,
}: {
  selection: GuideSelection;
  wdt: WdtChoice;
  onRestart: () => void;
  onBack: () => void;
}) {
  const { data, addBrew } = useCoffeeCommand();
  const { data: app } = useAppData();
  const done = completionFor(selection);

  const [open, setOpen] = useState(false);
  const [personId, setPersonId] = useState<PersonId | null>(null);
  const [beanId, setBeanId] = useState<string | null>(null);
  const [grind, setGrind] = useState("");
  const [rating, setRating] = useState<number | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    // Defaults come from external stores; defer so we don't set state synchronously in the effect.
    const id = window.setTimeout(() => {
      setPersonId((prev) => prev ?? getActivePersonId());
      setBeanId((prev) => prev ?? data.activeBeanId);
    }, 0);
    return () => window.clearTimeout(id);
  }, [data.activeBeanId]);

  const save = () => {
    if (!personId || saved) return;
    addBrew({
      personId,
      beanId,
      method: brewMethodFor(selection),
      durationSeconds: 0,
      brewedAt: new Date().toISOString(),
      rating,
      note: brewNoteFor(selection, { grind, wdt }),
    });
    setSaved(true);
  };

  return (
    <section className="flex flex-col gap-6" aria-labelledby="guide-done-title">
      <div className="space-y-3">
        <h2
          id="guide-done-title"
          className="font-display text-5xl tracking-tight landscape-tablet:text-6xl"
        >
          {done.headline}
        </h2>
        {done.tip ? (
          <p className="max-w-3xl text-xl leading-snug text-[color:var(--quiet)]">{done.tip}</p>
        ) : null}
      </div>

      {open ? (
        <div className="space-y-5 rounded-[2rem] bg-[color:var(--surface)] px-6 py-6">
          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase">
              Wer trinkt?
            </p>
            <div className="flex flex-wrap gap-2">
              {app.persons.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  disabled={saved}
                  className={chip(personId === p.id)}
                  onClick={() => setPersonId(p.id)}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase">
              Bohne
            </p>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={saved}
                className={chip(beanId === null)}
                onClick={() => setBeanId(null)}
              >
                Ohne Bohne
              </button>
              {data.beans.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  disabled={saved}
                  className={chip(beanId === b.id)}
                  onClick={() => setBeanId(b.id)}
                >
                  {b.name}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-wrap items-end gap-6">
            <label className="space-y-2">
              <span className="block text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase">
                Mahlgrad (wie eingestellt)
              </span>
              <input
                value={grind}
                disabled={saved}
                onChange={(e) => setGrind(e.target.value.slice(0, 10))}
                inputMode="numeric"
                className="h-14 w-40 rounded-2xl bg-[color:var(--bg)] px-4 text-xl outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
            <div className="space-y-2">
              <p className="text-sm font-semibold tracking-[0.16em] text-[color:var(--quiet)] uppercase">
                Bewertung (optional)
              </p>
              <div className="flex gap-2" role="group" aria-label="Bewertung">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    disabled={saved}
                    aria-label={`${n} von 5`}
                    aria-pressed={rating === n}
                    className={cn(chip(rating !== null && n <= rating), "w-14 px-0 text-2xl")}
                    onClick={() => setRating(rating === n ? null : n)}
                  >
                    ★
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              disabled={!personId || saved}
              onClick={save}
              className="h-16 rounded-2xl bg-[color:var(--ink)] px-10 text-xl font-medium text-[color:var(--surface)] disabled:opacity-40 active:scale-[0.98]"
            >
              {saved ? "Gespeichert ✓" : "Speichern"}
            </button>
            {!personId && !saved ? (
              <p className="text-lg text-[color:var(--quiet)]">Wähle zuerst, wer trinkt.</p>
            ) : null}
          </div>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={onBack}
          className="h-16 rounded-2xl bg-[color:var(--surface)] px-8 text-xl font-medium active:scale-[0.98]"
        >
          Zurück
        </button>
        {!open ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="h-16 rounded-2xl bg-[color:var(--ink)] px-8 text-xl font-medium text-[color:var(--surface)] active:scale-[0.98]"
          >
            Bezug speichern
          </button>
        ) : null}
        <button
          type="button"
          onClick={onRestart}
          className="h-16 rounded-2xl bg-[color:var(--surface)] px-8 text-xl font-medium active:scale-[0.98]"
        >
          Noch einen machen
        </button>
        <Link
          href="/kaffee"
          className="inline-flex h-16 items-center rounded-2xl bg-[color:var(--surface)] px-8 text-xl font-medium active:scale-[0.98]"
        >
          Zum Kaffee-Dashboard
        </Link>
      </div>
    </section>
  );
}
