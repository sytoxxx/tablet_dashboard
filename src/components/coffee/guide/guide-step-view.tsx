"use client";

import { HelpCircle } from "lucide-react";
import { CoffeeGuideImage } from "@/components/coffee/guide/coffee-guide-image";
import type { GuideStep } from "@/lib/coffee/guide/types";

const WDT_HOW: Array<{ title: string; text: string }> = [
  { title: "Nadeln ins Pulver", text: "Setze die Nadeln in das Kaffeepulver." },
  { title: "Vorsichtig umrühren", text: "Rühre sanft, bis keine Klumpen mehr da sind." },
  { title: "Nicht stochern", text: "Nicht aggressiv herumstochern — behutsam bleiben." },
  { title: "Oberfläche glatt", text: "Am Ende liegt die Oberfläche möglichst gleichmäßig." },
];

const LOCK_STAGES = ["Punkt auf Punkt", "Fest drehen", "Punkt am Lock-Pfeil"];

const primaryButton =
  "h-16 min-w-52 rounded-2xl bg-[color:var(--ink)] px-10 text-xl font-medium text-[color:var(--surface)] transition-transform duration-150 active:scale-[0.98]";
const secondaryButton =
  "h-16 rounded-2xl bg-[color:var(--surface)] px-8 text-xl font-medium transition-transform duration-150 active:scale-[0.98]";

export function GuideStepView({
  step,
  index,
  total,
  wdtHow,
  beanGrindHint,
  onNext,
  onBack,
  onWdtUse,
  onWdtSkip,
  onPartHelp,
}: {
  step: GuideStep;
  index: number;
  total: number;
  wdtHow: boolean;
  /** e.g. "Zuletzt notiert für Bohne X: 12" — only a reminder, never the instruction. */
  beanGrindHint: string | null;
  onNext: () => void;
  onBack: () => void;
  onWdtUse: () => void;
  onWdtSkip: () => void;
  onPartHelp: () => void;
}) {
  const showWdtHow = step.kind === "wdt" && wdtHow;
  const imageSlot = showWdtHow ? "wdt-stirring" : step.image;

  return (
    <section
      className="grid gap-6 landscape-tablet:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] landscape-tablet:gap-6"
      aria-label={`Schritt ${index + 1} von ${total}`}
    >
      <CoffeeGuideImage
        key={imageSlot}
        slot={imageSlot}
        className="aspect-[4/3] w-full landscape-tablet:aspect-auto landscape-tablet:h-[calc(100dvh-11rem)] landscape-tablet:min-h-[24rem]"
      />

      <div className="flex min-w-0 flex-col gap-4">
        <div className="space-y-3">
          <div className="flex items-center gap-4">
            <p className="text-xl font-semibold tabular-nums text-[color:var(--quiet)]">
              Schritt {index + 1} von {total}
            </p>
            <div
              className="h-2 flex-1 overflow-hidden rounded-full bg-[color:var(--hairline)]"
              role="progressbar"
              aria-valuemin={1}
              aria-valuemax={total}
              aria-valuenow={index + 1}
            >
              <div
                className="h-full rounded-full bg-[color:var(--ink)] transition-[width] duration-300"
                style={{ width: `${((index + 1) / total) * 100}%` }}
              />
            </div>
          </div>

          <h2 className="font-display text-5xl leading-tight tracking-tight landscape-tablet:text-[2.75rem]">
            {showWdtHow ? "WDT benutzen" : step.title}
          </h2>
        </div>

        {showWdtHow ? (
          <ol className="space-y-3">
            {WDT_HOW.map((item, i) => (
              <li key={item.title} className="flex gap-4">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-lg font-semibold text-[color:var(--surface)]">
                  {i + 1}
                </span>
                <span className="text-2xl leading-snug">
                  <span className="font-medium">{item.title}.</span>{" "}
                  <span className="text-[color:var(--quiet)]">{item.text}</span>
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <>
            <p className="text-2xl leading-snug">{step.body}</p>

            {step.kind === "grind" ? (
              <div className="space-y-1 rounded-2xl bg-[color:var(--surface)] px-5 py-3">
                <p className="text-xl font-semibold">Die Anzeige der Maschine hat Vorrang.</p>
                {step.note ? (
                  <p className="text-base leading-snug text-[color:var(--quiet)]">{step.note}</p>
                ) : null}
                {beanGrindHint ? (
                  <p className="text-base leading-snug text-[color:var(--quiet)]">{beanGrindHint}</p>
                ) : null}
              </div>
            ) : null}

            {step.kind === "lock" ? (
              <ol className="grid grid-cols-3 gap-2" aria-label="Einspannen in drei Schritten">
                {LOCK_STAGES.map((label, i) => (
                  <li
                    key={label}
                    className="flex flex-col items-start gap-2 rounded-2xl bg-[color:var(--surface)] px-3 py-3"
                  >
                    <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-[color:var(--ink)] text-base font-semibold text-[color:var(--surface)]">
                      {i + 1}
                    </span>
                    <span className="text-lg leading-tight">{label}</span>
                  </li>
                ))}
              </ol>
            ) : null}

            {step.note && step.kind !== "grind" ? (
              <p className="text-lg leading-snug text-[color:var(--quiet)]">{step.note}</p>
            ) : null}

            {step.unverified ? (
              <p
                data-testid="guide-unverified"
                className="rounded-2xl bg-amber-50 px-4 py-3 text-base leading-snug text-amber-950"
              >
                <span className="font-semibold">Noch nicht an deiner Maschine bestätigt.</span> {step.unverified}
              </p>
            ) : null}
          </>
        )}

        <div className="mt-auto flex flex-col gap-2 pt-2">
          {step.parts.length > 0 && !showWdtHow ? (
            <div>
              <button
                type="button"
                onClick={onPartHelp}
                className="inline-flex min-h-12 items-center gap-2 rounded-2xl px-2 text-lg font-medium text-[color:var(--quiet)] underline-offset-4 hover:text-[color:var(--ink)] hover:underline active:scale-[0.98]"
              >
                <HelpCircle className="size-6" aria-hidden />
                Welches Teil ist das?
              </button>
            </div>
          ) : null}

          <div className="flex flex-wrap gap-3">
            <button type="button" className={secondaryButton} onClick={onBack}>
              Zurück
            </button>
            {step.kind === "wdt" && !showWdtHow ? (
              <>
                <button type="button" className={primaryButton} onClick={onWdtUse}>
                  WDT verwenden
                </button>
                <button type="button" className={secondaryButton} onClick={onWdtSkip}>
                  Überspringen
                </button>
              </>
            ) : (
              <button type="button" className={primaryButton} onClick={onNext}>
                {showWdtHow ? "Weiter" : (step.confirmLabel ?? "Weiter")}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
