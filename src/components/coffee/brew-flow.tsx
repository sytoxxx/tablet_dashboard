"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { CoffeeStopwatch } from "@/components/coffee/coffee-stopwatch";
import { useAppData } from "@/components/providers/data-provider";
import { getActivePersonId } from "@/lib/profile/active-person";
import { recipeForMethod } from "@/lib/coffee/recipes";
import {
  COFFEE_METHOD_LABELS,
  COFFEE_METHODS,
  type CoffeeBrewMethod,
} from "@/lib/coffee/types";
import type { PersonId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { formatTimer } from "@/lib/format";

type Step = "bean" | "method" | "brew" | "save" | "done";

export function BrewFlow() {
  const { ready, data, addBrew } = useCoffeeCommand();
  const { data: app } = useAppData();

  const [step, setStep] = useState<Step>("bean");
  const [personId, setPersonId] = useState<PersonId>("levi");
  const [beanId, setBeanId] = useState<string | null>(null);
  const [hydratedPrefs, setHydratedPrefs] = useState(false);

  useEffect(() => {
    if (!ready || hydratedPrefs) return;
    const active = getActivePersonId();
    const nextBean = data.activeBeanId;
    const id = window.setTimeout(() => {
      if (active) setPersonId(active);
      setBeanId(nextBean);
      setHydratedPrefs(true);
    }, 0);
    return () => window.clearTimeout(id);
  }, [ready, data.activeBeanId, hydratedPrefs]);
  const [method, setMethod] = useState<CoffeeBrewMethod>("espresso");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [rating, setRating] = useState<number | null>(null);
  const [note, setNote] = useState("");
  const [brewedAt, setBrewedAt] = useState(() => toLocalInputValue(new Date()));
  const [saving, setSaving] = useState(false);

  const recipe = useMemo(
    () => recipeForMethod(method, app.coffeeDrinks),
    [method, app.coffeeDrinks],
  );

  const onStopped = (seconds: number) => {
    setDurationSeconds(seconds);
    setBrewedAt(toLocalInputValue(new Date()));
    setStep("save");
  };

  const saveBrew = () => {
    if (saving) return;
    setSaving(true);
    const iso = fromLocalInputValue(brewedAt) ?? new Date().toISOString();
    // addBrew already sets activeBeanId when beanId is known — do not chain
    // setActiveBeanId here (stale closure previously wiped the new brew).
    addBrew({
      personId,
      beanId,
      method,
      recipeId: recipe.id,
      durationSeconds,
      brewedAt: iso,
      rating,
      note: note.trim() || undefined,
    });
    setStep("done");
    setSaving(false);
  };

  return (
    <div className="space-y-8">
      <ol className="flex flex-wrap gap-2 text-sm text-[color:var(--quiet)]" aria-label="Ablauf">
        {(
          [
            ["bean", "Bohne"],
            ["method", "Methode"],
            ["brew", "Stoppuhr"],
            ["save", "Speichern"],
          ] as const
        ).map(([key, label]) => (
          <li
            key={key}
            className={cn(
              "rounded-full px-3 py-1",
              step === key || (step === "done" && key === "save")
                ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                : "bg-[color:var(--surface)]",
            )}
          >
            {label}
          </li>
        ))}
      </ol>

      {step === "bean" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Welche Bohne?</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setBeanId(null)}
              className={cn(
                "min-h-20 rounded-[1.5rem] px-5 text-left text-lg transition-[transform,background-color] active:scale-[0.98]",
                beanId === null
                  ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                  : "bg-[color:var(--surface)]",
              )}
            >
              Ohne Bohne
            </button>
            {data.beans.map((bean) => (
              <button
                key={bean.id}
                type="button"
                onClick={() => setBeanId(bean.id)}
                className={cn(
                  "min-h-20 rounded-[1.5rem] px-5 text-left transition-[transform,background-color] active:scale-[0.98]",
                  beanId === bean.id
                    ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                    : "bg-[color:var(--surface)]",
                )}
              >
                <span className="block text-lg font-medium">{bean.name}</span>
                {bean.roaster ? (
                  <span className="text-sm opacity-80">{bean.roaster}</span>
                ) : null}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary" size="lg" className="h-14 rounded-2xl">
              <Link href="/kaffee/bohnen/scannen">Bohne scannen</Link>
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={() => setStep("method")}
            >
              Weiter
            </Button>
          </div>
        </section>
      ) : null}

      {step === "method" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Methode & Rezept</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {COFFEE_METHODS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMethod(m)}
                className={cn(
                  "min-h-16 rounded-[1.5rem] px-4 text-lg transition-[transform,background-color] active:scale-[0.98]",
                  method === m
                    ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                    : "bg-[color:var(--surface)]",
                )}
              >
                {COFFEE_METHOD_LABELS[m]}
              </button>
            ))}
          </div>
          <div className="rounded-[1.5rem] bg-[color:var(--surface)] px-5 py-5 space-y-3">
            <p className="font-display text-2xl">{recipe.name}</p>
            {recipe.amounts ? (
              <p className="text-[color:var(--quiet)]">{recipe.amounts}</p>
            ) : null}
            {recipe.notes ? <p>{recipe.notes}</p> : null}
            {recipe.steps?.length ? (
              <ol className="space-y-2 text-lg">
                {recipe.steps.map((s, i) => (
                  <li key={s} className="flex gap-3">
                    <span className="text-[color:var(--quiet)]">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => setStep("bean")}
            >
              Zurück
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl"
              onClick={() => setStep("brew")}
            >
              Zur Stoppuhr
            </Button>
          </div>
        </section>
      ) : null}

      {step === "brew" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Brühen</h2>
          <CoffeeStopwatch recipe={recipe} onStopped={onStopped} />
          <Button
            type="button"
            variant="secondary"
            size="lg"
            className="h-14 rounded-2xl bg-[color:var(--surface)]"
            onClick={() => setStep("method")}
          >
            Zurück
          </Button>
        </section>
      ) : null}

      {step === "save" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Brühung speichern?</h2>
          <p className="text-lg text-[color:var(--quiet)]">
            Zeit: <span className="text-[color:var(--ink)]">{formatTimer(durationSeconds)}</span>
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--quiet)]">Person</span>
              <select
                value={personId}
                onChange={(e) => setPersonId(e.target.value as PersonId)}
                className="h-14 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              >
                {app.persons.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-sm text-[color:var(--quiet)]">Datum & Zeit</span>
              <input
                type="datetime-local"
                value={brewedAt}
                onChange={(e) => setBrewedAt(e.target.value)}
                className="h-14 w-full rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              />
            </label>
          </div>
          <div className="space-y-2">
            <span className="text-sm text-[color:var(--quiet)]">Bewertung (optional)</span>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => setRating(rating === n ? null : n)}
                  className={cn(
                    "min-h-12 min-w-12 rounded-2xl text-lg active:scale-[0.97]",
                    rating === n
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <label className="block space-y-2">
            <span className="text-sm text-[color:var(--quiet)]">Notiz (optional)</span>
            <textarea
              rows={3}
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, 400))}
              className="w-full rounded-2xl bg-[color:var(--surface)] px-4 py-3 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
              placeholder="Geschmack, Mahlgrad, …"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl"
              disabled={saving}
              onClick={saveBrew}
            >
              Ja, speichern
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => setStep("done")}
            >
              Nein, verwerfen
            </Button>
          </div>
        </section>
      ) : null}

      {step === "done" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Fertig</h2>
          <p className="text-lg text-[color:var(--quiet)]">
            Genieß deinen Kaffee. Statistik und Verlauf aktualisieren sich aus gespeicherten Brühungen.
          </p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-14 rounded-2xl">
              <Link href="/kaffee">Zum Dashboard</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => {
                setDurationSeconds(0);
                setRating(null);
                setNote("");
                setStep("bean");
              }}
            >
              Nochmal brühen
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalInputValue(value: string): string | null {
  const t = Date.parse(value);
  if (!Number.isFinite(t)) return null;
  return new Date(t).toISOString();
}
