"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Coffee } from "lucide-react";
import { useCoffeeCommand } from "@/components/coffee/coffee-command-provider";
import { useAppData } from "@/components/providers/data-provider";
import { EmptyState } from "@/components/empty-state";
import { Skeleton } from "@/components/shared/skeleton";
import { recommendBeanForMethod } from "@/lib/coffee/recommendations";
import { guidedStepsForDrink } from "@/lib/coffee/guided-steps";
import type { CoffeeBrewMethod } from "@/lib/coffee/types";
import type { CoffeeDrinkId } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type Step = "drink" | "bean" | "steps" | "done";

/**
 * Kaffee machen — interactive step assistant. Only real, admin-configured
 * drinks/steps and real registered beans; nothing here is invented.
 */
export function CoffeeMakeFlow() {
  const { ready, data, updateBean } = useCoffeeCommand();
  const { data: app } = useAppData();

  const [step, setStep] = useState<Step>("drink");
  const [drinkId, setDrinkId] = useState<CoffeeDrinkId | null>(null);
  const [beanId, setBeanId] = useState<string | null | undefined>(undefined);
  const [stepIndex, setStepIndex] = useState(0);
  const [grindDraft, setGrindDraft] = useState("");

  const drink = useMemo(
    () => app.coffeeDrinks.find((d) => d.id === drinkId) ?? null,
    [app.coffeeDrinks, drinkId],
  );
  const bean = useMemo(
    () => (beanId ? (data.beans.find((b) => b.id === beanId) ?? null) : null),
    [data.beans, beanId],
  );
  const recommended = useMemo(
    () =>
      drinkId
        ? recommendBeanForMethod(data.beans, data.brews, drinkId as CoffeeBrewMethod)
        : null,
    [data.beans, data.brews, drinkId],
  );
  const guidedSteps = useMemo(
    () => (drink ? guidedStepsForDrink(drink) : []),
    [drink],
  );
  const currentStep = guidedSteps[stepIndex] ?? null;

  useEffect(() => {
    const applyGrindDraft = (next: string) => {
      setGrindDraft((prev) => (prev === next ? prev : next));
    };
    applyGrindDraft(bean?.grindSetting ?? "");
  }, [bean?.id, bean?.grindSetting]);

  if (!ready) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  const restart = () => {
    setDrinkId(null);
    setBeanId(undefined);
    setStepIndex(0);
    setStep("drink");
  };

  const grindDirty = Boolean(bean) && grindDraft.trim() !== (bean?.grindSetting ?? "");
  const saveGrind = () => {
    if (!bean) return;
    updateBean(bean.id, { grindSetting: grindDraft.trim() || undefined });
  };

  return (
    <div className="space-y-8">
      {step === "drink" ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">Was möchtest du machen?</h2>
          <div className="grid gap-3 sm:grid-cols-3">
            {app.coffeeDrinks.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => {
                  setDrinkId(d.id);
                  setBeanId(undefined);
                  setStepIndex(0);
                  setStep("bean");
                }}
                className="min-h-20 rounded-[1.5rem] bg-[color:var(--surface)] px-5 text-left text-lg font-medium transition-[transform,background-color] active:scale-[0.98] hover:bg-[color:var(--surface-strong)]"
              >
                {d.name}
              </button>
            ))}
          </div>
        </section>
      ) : null}

      {step === "bean" && drink ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">
            <Coffee className="mr-2 inline size-7 align-[-0.1em]" aria-hidden />
            {drink.name}
          </h2>
          {data.beans.length === 0 ? (
            <>
              <EmptyState
                title="Noch keine Bohnen registriert"
                description="Registriere zuerst eine Bohne im Coffee Command Center."
              />
              <Button asChild size="lg" className="h-14 rounded-2xl">
                <Link href="/kaffee/bohnen/scannen">Bohne hinzufügen</Link>
              </Button>
            </>
          ) : (
            <>
              {recommended ? (
                <p className="text-lg text-[color:var(--quiet)]">
                  Für {drink.name} empfehlen wir:{" "}
                  <span className="text-[color:var(--ink)]">{recommended.name}</span>
                  {" "}<span className="text-sm">(aus deinen gespeicherten Brühungen)</span>
                </p>
              ) : (
                <p className="text-lg text-[color:var(--quiet)]">
                  Welche Bohne möchtest du verwenden?
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setBeanId(null)}
                  className={cn(
                    "min-h-16 rounded-[1.5rem] px-5 text-left text-lg transition-[transform,background-color] active:scale-[0.98]",
                    beanId === null
                      ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                      : "bg-[color:var(--surface)]",
                  )}
                >
                  Ohne Bohne
                </button>
                {data.beans.map((b) => (
                  <button
                    key={b.id}
                    type="button"
                    onClick={() => setBeanId(b.id)}
                    className={cn(
                      "min-h-16 rounded-[1.5rem] px-5 text-left transition-[transform,background-color] active:scale-[0.98]",
                      beanId === b.id
                        ? "bg-[color:var(--ink)] text-[color:var(--surface)]"
                        : "bg-[color:var(--surface)]",
                      recommended?.id === b.id &&
                        beanId !== b.id &&
                        "ring-2 ring-[color:var(--brand)]",
                    )}
                  >
                    <span className="block text-lg font-medium">{b.name}</span>
                    {b.roaster ? (
                      <span className="text-sm opacity-80">{b.roaster}</span>
                    ) : null}
                  </button>
                ))}
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={() => setStep("drink")}
            >
              Zurück
            </Button>
            <Button
              type="button"
              size="lg"
              className="h-14 rounded-2xl"
              disabled={beanId === undefined}
              onClick={() => setStep("steps")}
            >
              Weiter
            </Button>
          </div>
        </section>
      ) : null}

      {step === "steps" && drink ? (
        guidedSteps.length === 0 ? (
          <section className="space-y-5">
            <EmptyState
              title="Noch kein Rezept hinterlegt"
              description={`Für ${drink.name} sind noch keine Zubereitungsschritte konfiguriert.`}
            />
            <div className="flex flex-wrap gap-3">
              <Button
                asChild
                variant="secondary"
                size="lg"
                className="h-14 rounded-2xl bg-[color:var(--surface)]"
              >
                <Link href="/einstellungen/kaffee">Zu den Einstellungen</Link>
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-14 rounded-2xl"
                onClick={() => setStep("done")}
              >
                Überspringen
              </Button>
            </div>
          </section>
        ) : (
          <section className="space-y-6 rounded-[2rem] bg-[color:var(--surface)] px-6 py-8 sm:px-10 sm:py-10">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-2xl tracking-tight sm:text-3xl">
                <Coffee className="mr-2 inline size-6 align-[-0.1em]" aria-hidden />
                {drink.name}
              </h2>
              <p className="tabular-nums text-[color:var(--quiet)]">
                {stepIndex + 1} / {guidedSteps.length}
              </p>
            </div>

            <div
              className="flex h-40 items-center justify-center rounded-[1.5rem] bg-[color:var(--bg)] sm:h-56"
              aria-hidden
            >
              {currentStep?.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={currentStep.image}
                  alt=""
                  className="h-full w-full rounded-[1.5rem] object-cover"
                />
              ) : (
                <Coffee className="size-16 text-[color:var(--quiet)]" />
              )}
            </div>

            <div className="space-y-3">
              <p className="text-sm font-semibold tracking-[0.14em] text-[color:var(--quiet)] uppercase">
                {currentStep?.title}
              </p>
              <p className="font-display text-2xl leading-snug tracking-tight sm:text-3xl">
                {currentStep?.description}
              </p>

              {currentStep?.kind === "grind" ? (
                <div className="space-y-2 rounded-2xl bg-[color:var(--bg)] px-4 py-4">
                  {bean ? (
                    <>
                      <p className="text-base text-[color:var(--quiet)]">
                        {bean.grindSetting
                          ? `Gespeichert für ${bean.name}: Mahlgrad ${bean.grindSetting}`
                          : `Noch kein Mahlgrad für ${bean.name} gespeichert. Richtwert: ca. 10 (ungefährer Startwert).`}
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          value={grindDraft}
                          onChange={(e) => setGrindDraft(e.target.value.slice(0, 10))}
                          placeholder="z. B. 10"
                          className="h-12 w-32 rounded-2xl bg-[color:var(--surface)] px-4 text-lg outline-none ring-[color:var(--brand)] focus:ring-2"
                        />
                        {grindDirty ? (
                          <Button
                            type="button"
                            size="lg"
                            className="h-12 rounded-2xl"
                            onClick={saveGrind}
                          >
                            Neue Einstellung speichern
                          </Button>
                        ) : null}
                      </div>
                    </>
                  ) : (
                    <p className="text-base text-[color:var(--quiet)]">
                      Richtwert: ca. 10 (ungefährer Startwert — ohne Bohne nicht speicherbar).
                    </p>
                  )}
                </div>
              ) : null}

              {currentStep?.kind === "machine-button" ? (
                <div className="rounded-2xl bg-[color:var(--bg)] px-4 py-4">
                  <p className="text-base text-[color:var(--quiet)]">
                    {drink.machineButtonLabel ? (
                      <>
                        Drücken:{" "}
                        <span className="font-semibold text-[color:var(--ink)]">
                          „{drink.machineButtonLabel}“
                        </span>
                      </>
                    ) : (
                      "Die passende Taste an der Maschine drücken."
                    )}
                  </p>
                </div>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3 pt-2">
              <Button
                type="button"
                variant="secondary"
                size="lg"
                className="h-14 rounded-2xl bg-[color:var(--bg)]"
                onClick={() =>
                  stepIndex === 0 ? setStep("bean") : setStepIndex((i) => i - 1)
                }
              >
                Zurück
              </Button>
              <Button
                type="button"
                size="lg"
                className="h-14 rounded-2xl"
                onClick={() =>
                  stepIndex + 1 >= guidedSteps.length
                    ? setStep("done")
                    : setStepIndex((i) => i + 1)
                }
              >
                {stepIndex + 1 >= guidedSteps.length ? "Fertig" : "Weiter"}
              </Button>
            </div>

            <div className="flex justify-center gap-1.5" aria-hidden>
              {guidedSteps.map((s, i) => (
                <span
                  key={s.title}
                  className={cn(
                    "size-2 rounded-full",
                    i === stepIndex
                      ? "bg-[color:var(--ink)]"
                      : "bg-[color:var(--hairline)]",
                  )}
                />
              ))}
            </div>
          </section>
        )
      ) : null}

      {step === "done" && drink ? (
        <section className="space-y-5">
          <h2 className="font-display text-3xl">
            <Coffee className="mr-2 inline size-7 align-[-0.1em]" aria-hidden />
            Fertig
          </h2>
          <p className="text-lg text-[color:var(--quiet)]">{drink.name} fertig.</p>
          <div className="flex flex-wrap gap-3">
            <Button asChild size="lg" className="h-14 rounded-2xl">
              <Link href="/kaffee">Zum Dashboard</Link>
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="lg"
              className="h-14 rounded-2xl bg-[color:var(--surface)]"
              onClick={restart}
            >
              Noch einen machen
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
